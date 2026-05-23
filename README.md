# FieldCompliance

Oilfield environmental compliance SaaS — multi-tenant platform for EPA GHG reporting, LDAR tracking, and deadline management for small-to-mid E&P operators.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL (DigitalOcean)
- **Frontend**: Next.js 15 App Router + Tailwind + shadcn/ui (Vercel)
- **Mobile**: React Native / Expo (Android-first)
- **Jobs**: BullMQ + Redis (deadline alerts, reg feed polling)
- **Storage**: DigitalOcean Spaces (S3-compatible)
- **Email**: SendGrid / Resend
- **Billing**: Stripe

## Local setup

```bash
# 1. Copy env
cp .env.example .env
# Fill in DATABASE_URL at minimum

# 2. Install deps
npm install

# 3. Push schema to DB (dev — no migration history)
npm run db:push

# 4. Seed regulations + sample data
npm run db:seed

# 5. Open Prisma Studio
npm run db:studio
```

## Database scripts

| Command | What it does |
|---|---|
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:push` | Push schema to DB without migration (dev only) |
| `npm run db:migrate` | Create and run a named migration |
| `npm run db:seed` | Seed regulations, emission factors, sample org |
| `npm run db:studio` | Open Prisma Studio browser UI |
| `npm run db:reset` | Wipe DB and reseed (dev only) |

## Schema overview

| Model | Purpose |
|---|---|
| Organization | Multi-tenant root. One org per E&P company. |
| User | Org members with role-based access. |
| UserFacility | Scopes SITE_MANAGER / FIELD_TECH to specific sites. |
| Facility | Well sites, compressor stations, tank batteries. |
| Equipment | Tagged equipment at each facility. |
| Regulation | Master catalog of EPA + state regulations. |
| RegulationVersion | Versioned snapshots — rules change over time. |
| RegulationRule | Granular requirements (survey freq, calc method, etc). |
| OrgRegulation | Which regulations an org is enrolled in. |
| Deadline | Computed upcoming obligations per facility. |
| DeadlineAlert | Scheduled email/SMS alert queue. |
| Inspection | Field OGI/LDAR survey records. |
| EmissionRecord | Calculated emission quantities. |
| EmissionFactor | EPA-approved AP-42 and OOOOb factors. |
| ComplianceReport | Generated annual reports (Subpart W, OOOOb, etc). |
| AuditLog | Immutable append-only action log. |
| ApiKey | Hashed API keys for consultant access. |

## Regulations seeded

- **EPA Subpart W** (40 CFR Part 98) — Annual GHG reporting
- **EPA OOOOb** (40 CFR Part 60) — New source performance standards
- **Texas TCEQ** (30 TAC) — State air quality rules

## Next steps

- [ ] NestJS backend scaffold (modules: auth, facilities, equipment, deadlines, emissions, reports)
- [ ] Deadline generation service (cron job — generates deadlines from RegulationRules per enrolled org)
- [ ] Emission calculator engine (TypeScript, pure functions, fully testable)
- [ ] Alert scheduler (BullMQ — 30/7/1 day email alerts before deadlines)
- [ ] Next.js admin frontend
- [ ] React Native field app

