# SendGrid Deadline Alerts — Setup

Per-deadline email alerts at 30 / 7 / 1 / 0 days before due, plus a
once-only overdue notice. Recipient is the assigned user, falling back to
all active ORG_ADMINs when a deadline is unassigned.

## ⚠ VERIFY FIRST — one assumption I couldn't check

`alerts.service.ts` includes `alerts: { select: { alertType: true } }` when
querying deadlines. That requires the `Deadline` model to have a reverse
relation to `DeadlineAlert` **named exactly `alerts`**. I only saw the
`DeadlineAlert` side of that relation, not the `Deadline` side.

Check it:

    grep -n "DeadlineAlert" prisma/schema.prisma

If the Deadline model's line reads something other than `alerts`
(e.g. `deadlineAlerts DeadlineAlert[]`), update the include in
`collectPendingAlerts()` to match, and the `d.alerts.some(...)`
check just below it.

If the reverse relation is **missing entirely**, add to the Deadline model:

    alerts      DeadlineAlert[]

...then run `npx prisma generate`. (No `db push` needed — a reverse
relation is client-side only, no column changes.)

## 1. Install the SendGrid SDK

    npm install @sendgrid/mail

## 2. Add env vars

Local `.env` and the droplet's `.env`:

    SENDGRID_API_KEY="SG.xxxxx"
    EMAIL_FROM="noreply@houghworks.com"
    EMAIL_FROM_NAME="FieldCompliance"

`FRONTEND_URL` is already set and gets reused for the email's CTA link.

**Note:** the sender address must be verified in SendGrid (Single Sender
Verification, or a domain authentication record on houghworks.com) or
SendGrid rejects the send with a 403. If houghworks.com is already
authenticated from your existing setup, any @houghworks.com address works.

## 3. Register both modules in app.module.ts

Add the imports:

    import { MailModule } from './mail/mail.module'
    import { AlertsModule } from './alerts/alerts.module'

And add `MailModule` and `AlertsModule` to the `imports: []` array.

## 4. Verify and deploy

    npx prisma generate
    npx tsc --noEmit
    git add src/mail src/alerts package.json package-lock.json
    git commit -m "feat: SendGrid deadline alert emails"
    git push origin main

Then on the droplet: add the env vars to `.env`, and run
`./deploy/deploy.sh`.

## 5. Test it

Without `SENDGRID_API_KEY` set, the service runs in dry-run mode — it logs
what it would have sent instead of sending. Good for a first smoke test:

    curl -X POST https://fc-api.houghworks.com/api/v1/alerts/send \
      -H "Authorization: Bearer $TOKEN"

Then check `pm2 logs fc-api` for `[DRY RUN]` lines.

With the key set, the same call sends real email.

**Expect "no alerts were due" on the first run** if your seeded deadlines
aren't near a threshold. The seeded Subpart W annual report is due
March 2027, well outside the 30-day window. To force a test, temporarily
move a deadline's due date:

    psql "$DATABASE_URL" << 'SQL'
    BEGIN;
    SELECT set_config('app.system_mode', 'on', true);
    UPDATE "Deadline" SET "dueDate" = NOW() + INTERVAL '5 days'
    WHERE "ruleCode" = 'SUBW-PNEUMATIC-CALC';
    COMMIT;
    SQL

(Note the `system_mode` wrapper — raw psql is subject to RLS.)

## Design notes

**Idempotency** is enforced by writing the threshold into
`DeadlineAlert.alertType` (`EMAIL_30D`, `EMAIL_7D`, `EMAIL_1D`, `EMAIL_0D`,
`EMAIL_OVERDUE`). A deadline gets at most one email per threshold, ever.
No schema change was needed — the existing `alertType` string field carries it.

**Threshold matching** maps to the nearest threshold at or above the actual
days-remaining, so a deadline 5 days out still fires the 7-day alert. This
means a missed cron run (server down over a weekend) doesn't silently skip
notifications.

**Failed sends leave `sentAt` null**, so a later sweep can retry them —
but the `DeadlineAlert` row is still created, so retries won't spam. If you
want automatic retry of failures, that's a follow-up: query for rows with
`sentAt IS NULL` and re-attempt.

**Transactions are never held open across an SMTP call.** The sweep reads
inside `asOrg`, sends outside any transaction, then records inside `asOrg`
again. Holding a Postgres transaction open while waiting on SendGrid would
be a real problem under load.

**Overdue alerts fire once, not daily.** Deliberate — a daily nag for the
same overdue item trains people to filter your emails. If you want
escalating reminders later, that's a separate feature with its own opt-out.
