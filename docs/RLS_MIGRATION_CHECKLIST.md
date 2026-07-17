# RLS Rollout — Deployment Plan and Service Checklist

## Goal
Enable Postgres Row-Level Security so tenant isolation is enforced at the database layer, not just by application-code discipline. If any query forgets its `orgId` filter, RLS returns 0 rows instead of leaking data.

## Overall approach
Every tenant-scoped query gets wrapped in `this.prisma.asOrg(orgId, tx => …)`. Every auth/system query gets `this.prisma.asSystem(tx => …)`. Any bare `this.prisma.model.…` call on a tenant table will return 0 rows once we're fully rolled out.

## Staged deployment

The migration is dangerous if code isn't ready — enabling RLS mid-flight would make every existing service return 0 rows. To avoid downtime:

### Stage 1 — Deploy code, keep RLS off
On TheBeast, drop in the new files (see "Files delivered" below). Commit and push. Deploy to the droplet via `./deploy/deploy.sh`. Nothing observable changes — the new `asOrg`/`asSystem` methods exist but are only used by auth service and facilities service so far. Existing traffic uses old code paths.

### Stage 2 — Grant BYPASSRLS temporarily
On the droplet, as root:
```bash
sudo -u postgres psql -d fieldcompliance -c "ALTER ROLE fc WITH BYPASSRLS;"
```

This lets `fc` ignore any RLS policies. It's a temporary shield so the app doesn't break in the next step.

### Stage 3 — Run the migration
Copy `prisma/migrations/rls-setup/migration.sql` up to the droplet. As `fc`:
```bash
psql "$DATABASE_URL" -f prisma/migrations/rls-setup/migration.sql
```

RLS is now enabled with policies, but `fc` bypasses them thanks to Stage 2.

### Stage 4 — Convert services progressively
For each service below, follow the pattern in `src/facilities/facilities.service.ts`:
1. Wrap every tenant-scoped query in `this.prisma.asOrg(orgId, tx => …)`
2. Keep the existing `where: { orgId }` filter as belt-and-suspenders
3. Deploy each conversion via `./deploy/deploy.sh`
4. Test the affected endpoints

Order matters less than making sure every service is converted before Stage 5.

### Stage 5 — Verify with isolation test
Copy `scripts/test-rls-isolation.js` up. Run it. Every test should pass:
```bash
node scripts/test-rls-isolation.js
```

Note: this test with `BYPASSRLS` still on will show test 1 failing ("No-context query returns 0 facilities" won't hold because `fc` bypasses RLS). That's expected. Move to Stage 6.

### Stage 6 — Revoke BYPASSRLS
```bash
sudo -u postgres psql -d fieldcompliance -c "ALTER ROLE fc WITH NOBYPASSRLS;"
```

Run the isolation test again — all checks should pass now.

If any endpoint breaks (returns 0 rows unexpectedly), you missed a service conversion. Grant `BYPASSRLS` back temporarily, fix, revoke again.

### Stage 7 — Monitor
For the next week, watch `pm2 logs fc-api` for any unexpected empty responses. Any leaked "unwrapped" query will now show up as an empty result set instead of a leak. Better than the alternative.

## Rollback
If something goes badly wrong:
```bash
sudo -u postgres psql -d fieldcompliance -c "ALTER ROLE fc WITH BYPASSRLS;"
```

RLS is now inert. Investigate, fix, revoke again. Nothing has to be redeployed.

## Service conversion checklist

Every service that queries tenant-scoped tables needs converting. Files to update:

- [x] `src/prisma/prisma.service.ts` — adds `asOrg` and `asSystem` methods (**delivered**)
- [x] `src/auth/auth.service.ts` — login/register/reset use `asSystem`; verifyUser uses `asOrg` (**delivered**)
- [x] `src/facilities/facilities.service.ts` — reference implementation (**delivered**)
- [ ] `src/users/users.service.ts` — every method wraps in `asOrg`
- [ ] `src/organizations/organizations.service.ts` — every method wraps in `asOrg`
- [ ] `src/equipment/equipment.service.ts` — every method wraps in `asOrg`
- [ ] `src/deadlines/deadlines.service.ts` — every method wraps in `asOrg`
- [ ] `src/deadlines/deadline-generator.service.ts` — the cron uses `asSystem` (system operation) then loops per-org internally with `asOrg`
- [ ] `src/emissions/emissions.service.ts` — every method wraps in `asOrg`
- [ ] `src/emissions/calculator/calculator.service.ts` — takes orgId already; wrap the persist/read blocks in `asOrg`
- [ ] `src/reports/reports.service.ts` — every method wraps in `asOrg`
- [ ] `prisma/seed.js` — top-level operations use `asSystem`

## Conversion pattern

**Before:**
```typescript
async list(orgId: string) {
  return this.prisma.facility.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  })
}
```

**After:**
```typescript
async list(orgId: string) {
  return this.prisma.asOrg(orgId, tx =>
    tx.facility.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    }),
  )
}
```

**For multi-step operations, wrap the whole block:**
```typescript
async create(orgId: string, dto: CreateFooDto) {
  return this.prisma.asOrg(orgId, async tx => {
    const parent = await tx.facility.findFirst({ where: { id: dto.facilityId } })
    if (!parent) throw new NotFoundException()
    return tx.foo.create({ data: { ...dto, orgId } })
  })
}
```

## Gotchas

**Do NOT nest `asOrg` inside another `asOrg`.** Postgres transactions don't nest — Prisma emulates it but you'll deadlock. If you find yourself doing this, refactor into one `asOrg` block.

**Seed script bypasses RLS.** Once BYPASSRLS is revoked from `fc`, you can't just run the raw seed. Update it to use `asSystem` at the top of each operation.

**The Prisma studio bypasses RLS.** It connects as `fc` and if BYPASSRLS is on, you see everything. Once BYPASSRLS is off, `prisma studio` will show empty tables — you'd need to set the session var manually via `psql`.

**`asOrg` costs one transaction per query.** This is fine for a small operator (dozens of req/sec). If you hit 1000 req/sec sustained, consider pgbouncer in session mode + connection-level session vars. Not before then.
