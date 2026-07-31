-- ============================================================================
-- FieldCompliance PROD — Table W-1 pneumatic factor correction
-- Run AFTER `npx prisma migrate deploy` has added "subType" to "EmissionFactor"
-- and gas composition columns to "Facility".
--
-- Pattern: EXPIRE the fabricated rows, INSERT correct rows. Never mutate a
-- factor row that EmissionRecord.emissionFactorId may reference — mutation
-- corrupts the provenance chain for already-persisted records.
--
-- Table/column names match Prisma defaults (PascalCase model, camelCase
-- columns, all quoted). Run as the fc role via psql; recommend running
-- interactively so you can inspect the verify SELECT before COMMIT.
-- ============================================================================

BEGIN;

-- Harmless if EmissionFactor is outside RLS (global reference table);
-- required for the EmissionRecord cleanup at the bottom.
SELECT set_config('app.system_mode', 'on', true);

-- 1. Expire the fabricated rows (idempotent: only touches still-open rows)
UPDATE "EmissionFactor"
SET "applicableUntil" = TIMESTAMP '2026-07-29 00:00:00',
    "notes" = COALESCE("notes", '') ||
      ' [SUPERSEDED 2026-07-29: fabricated value, never matched any EPA table. Replaced by ef-w1-* rows.]'
WHERE "id" IN ('ef-seed-0', 'ef-seed-1')
  AND "applicableUntil" IS NULL;

-- 2. Insert the verified Table W-1 rows (idempotent via ON CONFLICT)
INSERT INTO "EmissionFactor"
  ("id", "source", "equipmentCategory", "pollutant", "subType",
   "factorValue", "factorUnit", "applicableFrom", "notes", "federalRegCitation")
VALUES
  ('ef-w1-high-bleed', 'SUBPART_W', 'PNEUMATIC_CONTROLLER', 'CH4',
   'CONTINUOUS_HIGH_BLEED', 21, 'scf-whole-gas/hr', TIMESTAMP '2025-01-01',
   'Continuous high bleed pneumatic device vents, onshore production / gathering & boosting. WHOLE GAS factor — multiply by facility CH4 mole fraction per Eq. W-1B.',
   '40 CFR Part 98 Table W-1 (89 FR 42323)'),
  ('ef-w1-low-bleed', 'SUBPART_W', 'PNEUMATIC_CONTROLLER', 'CH4',
   'CONTINUOUS_LOW_BLEED', 6.8, 'scf-whole-gas/hr', TIMESTAMP '2025-01-01',
   'Continuous low bleed pneumatic device vents, onshore production / gathering & boosting. WHOLE GAS factor — multiply by facility CH4 mole fraction per Eq. W-1B.',
   '40 CFR Part 98 Table W-1 (89 FR 42323)'),
  ('ef-w1-intermittent', 'SUBPART_W', 'PNEUMATIC_CONTROLLER', 'CH4',
   'INTERMITTENT_BLEED', 8.8, 'scf-whole-gas/hr', TIMESTAMP '2025-01-01',
   'Intermittent bleed pneumatic device vents, onshore production / gathering & boosting. WHOLE GAS factor — multiply by facility CH4 mole fraction per Eq. W-1B.',
   '40 CFR Part 98 Table W-1 (89 FR 42323)'),
  ('ef-w1-pneumatic-pump', 'SUBPART_W', 'PNEUMATIC_PUMP', 'CH4',
   NULL, 13.3, 'scf-whole-gas/hr', TIMESTAMP '2025-01-01',
   'Natural gas driven pneumatic pumps, onshore production / gathering & boosting. WHOLE GAS factor. Calculator does not yet dispatch PNEUMATIC_PUMP — seeded ahead of that feature.',
   '40 CFR Part 98 Table W-1 (89 FR 42323)')
ON CONFLICT ("id") DO UPDATE
SET "factorValue"        = EXCLUDED."factorValue",
    "factorUnit"         = EXCLUDED."factorUnit",
    "subType"            = EXCLUDED."subType",
    "source"             = EXCLUDED."source",
    "notes"              = EXCLUDED."notes",
    "federalRegCitation" = EXCLUDED."federalRegCitation",
    "applicableFrom"     = EXCLUDED."applicableFrom";

-- 3. Purge known-wrong pneumatic records (pre-customer; delete-and-recompute)
--    Comment this block out if you'd rather keep them annotated.
DELETE FROM "EmissionRecord"
WHERE "emissionFactorId" IN ('ef-seed-0', 'ef-seed-1');

-- 4. Verify BEFORE committing. Expect:
--    ef-seed-0 / ef-seed-1  -> applicableUntil set (expired)
--    ef-w1-*                -> 21 / 6.8 / 8.8 / 13.3, unit scf-whole-gas/hr
SELECT "id", "subType", "factorValue", "factorUnit",
       "applicableFrom", "applicableUntil"
FROM "EmissionFactor"
WHERE "equipmentCategory" IN ('PNEUMATIC_CONTROLLER', 'PNEUMATIC_PUMP')
ORDER BY "applicableFrom", "id";

-- If anything looks wrong: ROLLBACK;
COMMIT;
