/**
 * FieldCompliance — Seed verified tank Calculation Method 3 factors.
 *
 * Equations W-15A (hydrocarbon liquids) and W-15B (produced water) per
 * 40 CFR 98.233(j)(3). Verified against live eCFR 2026-08-18.
 *
 * ef-seed-5 (fabricated 1.86 lb-VOC/bbl, "Table W-10") stays expired --
 * it was retired by fix-compressor-factors.js and is not revived here.
 *
 * Run: node prisma/fix-tank-method3-factors.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CITE_A = "40 CFR 98.233(j)(3), Equation W-15A (89 FR 42323)";
const CITE_B = "40 CFR 98.233(j)(3), Equation W-15B (89 FR 42323)";
const NOTE_A =
  "Atmospheric storage tank, Calculation Method 3, hydrocarbon liquids. " +
  "Per FEEDING unit (separator/well/non-separator equipment) with annual " +
  "average daily throughput > 0 and < 10 bbl/day. GHG-specific ANNUAL " +
  "factor -- no mole fraction, no hours term.";
const NOTE_B =
  "Atmospheric storage tank, Calculation Method 3, produced water. " +
  "Yields MASS DIRECTLY in metric tons CH4 -- do not apply density " +
  "conversion. CH4 only; no produced-water CO2 factor exists. Tier is " +
  "set by the feeding equipment pressure.";

const rows = [
  { id: "ef-w15a-crude-ch4", pollutant: "CH4", subType: "CRUDE_OIL_CH4", factorValue: 4.2, factorUnit: "Mscf-GHG/yr/unit", notes: NOTE_A, federalRegCitation: CITE_A },
  { id: "ef-w15a-crude-co2", pollutant: "CO2", subType: "CRUDE_OIL_CO2", factorValue: 2.8, factorUnit: "Mscf-GHG/yr/unit", notes: NOTE_A, federalRegCitation: CITE_A },
  { id: "ef-w15a-condensate-ch4", pollutant: "CH4", subType: "GAS_CONDENSATE_CH4", factorValue: 17.6, factorUnit: "Mscf-GHG/yr/unit", notes: NOTE_A, federalRegCitation: CITE_A },
  { id: "ef-w15a-condensate-co2", pollutant: "CO2", subType: "GAS_CONDENSATE_CO2", factorValue: 2.8, factorUnit: "Mscf-GHG/yr/unit", notes: NOTE_A, federalRegCitation: CITE_A },
  { id: "ef-w15b-water-le-50psi", pollutant: "CH4", subType: "PRODUCED_WATER_LE_50PSI", factorValue: 0.0015, factorUnit: "mt-CH4/Mbbl", notes: NOTE_B, federalRegCitation: CITE_B },
  { id: "ef-w15b-water-50-250psi", pollutant: "CH4", subType: "PRODUCED_WATER_50_250PSI", factorValue: 0.0142, factorUnit: "mt-CH4/Mbbl", notes: NOTE_B, federalRegCitation: CITE_B },
  { id: "ef-w15b-water-gt-250psi", pollutant: "CH4", subType: "PRODUCED_WATER_GT_250PSI", factorValue: 0.0508, factorUnit: "mt-CH4/Mbbl", notes: NOTE_B, federalRegCitation: CITE_B },
];

async function main() {
  console.log("Seeding tank Method 3 factors (W-15A / W-15B)...");

  for (const { id, ...rest } of rows) {
    const data = {
      source: "SUBPART_W",
      equipmentCategory: "STORAGE_TANK",
      applicableFrom: new Date("2025-01-01"),
      ...rest,
    };
    await prisma.emissionFactor.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log(`  \u2713 Seeded ${rows.length} tank Method 3 factor rows`);

  const check = await prisma.emissionFactor.findMany({
    where: { equipmentCategory: "STORAGE_TANK" },
    select: { id: true, pollutant: true, subType: true, factorValue: true, factorUnit: true, applicableUntil: true },
    orderBy: { id: "asc" },
  });
  console.log("\nCurrent state:");
  console.table(check);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
