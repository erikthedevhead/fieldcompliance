/**
 * FieldCompliance — Narrow prod correction: equipment-leak EmissionFactor rows.
 *
 * Expires ef-seed-2 (fabricated 0.00004 tpy-CH4/component "average fugitive
 * factor" — no such blended per-component factor exists in Subpart W) and
 * seeds the verified Table W-1 "Population Emission Factors — Major
 * Equipment" rows (89 FR 42323, eff. 2025-01-01), onshore production /
 * gathering & boosting, gas service and crude service blocks.
 *
 * Verified against live eCFR 2026-08-05.
 *
 * Storage convention: equipmentCategory = FUGITIVE_COMPONENT (the
 * equipment-leak source bucket), subType = `${MAJOR_EQUIPMENT}_${SERVICE}`.
 * No schema change required.
 *
 * Run: node prisma/fix-equipment-leak-factors.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const W1_CITATION = "40 CFR Part 98 Table W-1 (89 FR 42323)";
const NOTE =
  "Major-equipment population factor, onshore production / gathering & " +
  "boosting. WHOLE GAS per equipment unit -- multiply by facility CH4 " +
  "mole fraction per Eq. W-1B chain (98.233(r)).";

// [subTypeKey, factorValue] — scf whole gas/hour/unit
const GAS_SERVICE = [
  ["WELLHEAD_GAS", 8.87],
  ["SEPARATOR_GAS", 9.65],
  ["METERS_PIPING_GAS", 7.04],
  ["COMPRESSOR_GAS", 13.8],
  ["DEHYDRATOR_GAS", 8.09],
  ["HEATER_GAS", 5.22],
  ["STORAGE_VESSEL_GAS", 1.83],
];
const CRUDE_SERVICE = [
  ["WELLHEAD_CRUDE", 4.13],
  ["SEPARATOR_CRUDE", 4.77],
  ["METERS_PIPING_CRUDE", 12.4],
  ["COMPRESSOR_CRUDE", 13.8],
  ["DEHYDRATOR_CRUDE", 8.09],
  ["HEATER_CRUDE", 3.2],
  ["STORAGE_VESSEL_CRUDE", 1.91],
];

async function main() {
  console.log("Correcting equipment-leak EmissionFactor rows...");

  await prisma.emissionFactor.updateMany({
    where: { id: "ef-seed-2", applicableUntil: null },
    data: { applicableUntil: new Date() },
  });
  console.log("  \u2713 Expired ef-seed-2 (fabricated per-component factor)");

  const rows = [...GAS_SERVICE, ...CRUDE_SERVICE].map(([subType, value]) => ({
    id: `ef-w1-leak-${subType.toLowerCase().replace(/_/g, "-")}`,
    source: "SUBPART_W",
    equipmentCategory: "FUGITIVE_COMPONENT",
    pollutant: "CH4",
    subType,
    factorValue: value,
    factorUnit: "scf-whole-gas/hr",
    applicableFrom: new Date("2025-01-01"),
    notes: NOTE,
    federalRegCitation: W1_CITATION,
  }));

  for (const { id, ...data } of rows) {
    await prisma.emissionFactor.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log(`  \u2713 Seeded ${rows.length} ef-w1-leak-* rows (Table W-1 major equipment)`);

  const check = await prisma.emissionFactor.findMany({
    where: { equipmentCategory: "FUGITIVE_COMPONENT" },
    select: {
      id: true,
      subType: true,
      factorValue: true,
      factorUnit: true,
      applicableUntil: true,
    },
    orderBy: { id: "asc" },
  });
  console.log("\nCurrent state:");
  console.table(check);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
