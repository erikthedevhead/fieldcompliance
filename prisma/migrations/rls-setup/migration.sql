-- ============================================================
-- FieldCompliance — Row-Level Security setup
-- ============================================================
--
-- Enables RLS on all tenant-scoped tables. After this migration,
-- every query MUST set `app.current_org` (via `asOrg` in the app)
-- or `app.system_mode = 'on'` (via `asSystem` for auth/seed) or
-- it returns 0 rows on tenant tables.
--
-- Deployment order:
--   1. Deploy app code with asOrg/asSystem methods
--   2. GRANT BYPASSRLS to `fc` role (temporary — see notes at bottom)
--   3. Run this migration
--   4. Progressively convert services to use asOrg/asSystem
--   5. When all conversions done, REVOKE BYPASSRLS from `fc`
--
-- Global reference tables (Regulation, RegulationVersion, RegulationRule,
-- EmissionFactor) are shared across all tenants — no RLS needed there.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Enable RLS + FORCE on tenant-scoped tables
-- FORCE ensures RLS applies even to the table owner (fc user).
-- ------------------------------------------------------------

-- Directly org-scoped (has orgId column)
ALTER TABLE "Organization"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization"     FORCE ROW LEVEL SECURITY;
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"             FORCE ROW LEVEL SECURITY;
ALTER TABLE "OrgRegulation"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgRegulation"    FORCE ROW LEVEL SECURITY;
ALTER TABLE "Facility"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Facility"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "Deadline"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deadline"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceReport" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         FORCE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey"           FORCE ROW LEVEL SECURITY;

-- Indirectly org-scoped (via a parent relation)
ALTER TABLE "Equipment"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Equipment"        FORCE ROW LEVEL SECURITY;
ALTER TABLE "Inspection"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inspection"       FORCE ROW LEVEL SECURITY;
ALTER TABLE "EmissionRecord"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmissionRecord"   FORCE ROW LEVEL SECURITY;
ALTER TABLE "DeadlineAlert"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeadlineAlert"    FORCE ROW LEVEL SECURITY;
ALTER TABLE "UserFacility"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserFacility"     FORCE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Policies for directly org-scoped tables
--
-- Each policy allows a row when EITHER:
--   - the row's orgId matches app.current_org (normal tenant mode)
--   - app.system_mode is 'on' (trusted bypass for auth/seed)
-- ------------------------------------------------------------

CREATE POLICY tenant_isolation ON "Organization"
  USING (
    id = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "User"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "OrgRegulation"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "Facility"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "Deadline"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "ComplianceReport"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "AuditLog"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

CREATE POLICY tenant_isolation ON "ApiKey"
  USING (
    "orgId" = current_setting('app.current_org', true)
    OR current_setting('app.system_mode', true) = 'on'
  );

-- ------------------------------------------------------------
-- Policies for indirectly org-scoped tables
--
-- These check via join to the parent (Facility, Deadline, User).
-- The EXISTS subqueries recurse into the parent table's policy,
-- so the parent's orgId check applies transitively.
-- ------------------------------------------------------------

CREATE POLICY tenant_isolation ON "Equipment"
  USING (
    current_setting('app.system_mode', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "Facility" f
      WHERE f.id = "Equipment"."facilityId"
    )
  );

CREATE POLICY tenant_isolation ON "Inspection"
  USING (
    current_setting('app.system_mode', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "Facility" f
      WHERE f.id = "Inspection"."facilityId"
    )
  );

CREATE POLICY tenant_isolation ON "EmissionRecord"
  USING (
    current_setting('app.system_mode', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "Facility" f
      WHERE f.id = "EmissionRecord"."facilityId"
    )
  );

CREATE POLICY tenant_isolation ON "DeadlineAlert"
  USING (
    current_setting('app.system_mode', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "Deadline" d
      WHERE d.id = "DeadlineAlert"."deadlineId"
    )
  );

CREATE POLICY tenant_isolation ON "UserFacility"
  USING (
    current_setting('app.system_mode', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "Facility" f
      WHERE f.id = "UserFacility"."facilityId"
    )
  );

COMMIT;

-- ============================================================
-- POST-MIGRATION NOTES
-- ============================================================
--
-- After running this and converting all services:
--
--   -- Revoke BYPASSRLS so RLS is fully enforced (do NOT skip this)
--   ALTER ROLE fc WITH NOBYPASSRLS;
--
-- To verify RLS is enforced end-to-end:
--
--   SET ROLE fc;
--   SELECT * FROM "Facility";                    -- should return 0 rows
--   SET app.current_org = 'some-org-id';
--   SELECT * FROM "Facility";                    -- returns only that org's rows
--   SET app.current_org = '';
--   SELECT * FROM "Facility";                    -- 0 rows again
--
-- To roll back this migration (emergency only):
--
--   BEGIN;
--   ALTER TABLE "Facility" DISABLE ROW LEVEL SECURITY;
--   -- ... repeat for every table above
--   COMMIT;
-- ============================================================
