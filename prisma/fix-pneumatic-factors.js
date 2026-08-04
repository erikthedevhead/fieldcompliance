/**
 * FieldCompliance — Narrow prod correction: pneumatic EmissionFactor rows only.
 *
 * Does NOT touch Organization/User/Facility/Equipment/Deadline — unlike the
 * full seed.js, this is safe to run against a live prod DB with real
 * customer conversations in flight.
 *
 * Expires the fabricated ef-seed-0 / ef-seed-1 rows (never matched any
 * EPA table) and inserts the four verified Table W-1 rows (89 FR 42323,
 * eff. 2025-01-01), matching the shape already present in prisma/seed.js.
 *
 * Run: node prisma/fix-pneumatic-factors.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Correcting pneumatic EmissionFactor rows...");

  await prisma.emissionFactor.updateMany({
    where: { id: { in: ["ef-seed-0", "ef-seed-1"] }, applicableUntil: null },
    data: { applicableUntil: new Date() },
  });
  console.log("  \u2713 Expired ef-seed-0 / ef-seed-1 (fabricated values)");

  const W1_CITATION = "40 CFR Part 98 Table W-1 (89 FR 42323)";
  const W1_NOTE_SUFFIX =
    "onshore production / gathering & boosting. WHOLE GAS factor -- " +
    "multiply by facility CH4 mole fraction per Eq. W-1B.";

  const rows = [
    {
      id: "ef-w1-high-bleed",
      source: "SUBPART_W",
      equipmentCategory: "PNEUMATIC_CONTROLLER",
      pollutant: "CH4",
      subType: "CONTINUOUS_HIGH_BLEED",
      factorValue: 21,
      factorUnit: "scf-whole-gas/hr",
      applicableFrom: new Date("2025-01-01"),
      notes: `Continuous high bleed pneumatic device vents, ${W1_NOTE_SUFFIX}`,
      federalRegCitation: W1_CITATION,
    },
    {
      id: "ef-w1-low-bleed",
      source: "SUBPART_W",
      equipmentCategory: "PNEUMATIC_CONTROLLER",
      pollutant: "CH4",
      subType: "CONTINUOUS_LOW_BLEED",
      factorValue: 6.8,
      factorUnit: "scf-whole-gas/hr",
      applicableFrom: new Date("2025-01-01"),
      notes: `Continuous low bleed pneumatic device vents, ${W1_NOTE_SUFFIX}`,
      federalRegCitation: W1_CITATION,
    },
    {
      id: "ef-w1-intermittent",
      source: "SUBPART_W",
      equipmentCategory: "PNEUMATIC_CONTROLLER",
      pollutant: "CH4",
      subType: "INTERMITTENT_BLEED",
      factorValue: 8.8,
      factorUnit: "scf-whole-gas/hr",
      applicableFrom: new Date("2025-01-01"),
      notes: `Intermittent bleed pneumatic device vents, ${W1_NOTE_SUFFIX}`,
      federalRegCitation: W1_CITATION,
    },
    {
      id: "ef-w1-pneumatic-pump",
      source: "SUBPART_W",
      equipmentCategory: "PNEUMATIC_PUMP",
      pollutant: "CH4",
      subType: null,
      factorValue: 13.3,
      factorUnit: "scf-whole-gas/hr",
      applicableFrom: new Date("2025-01-01"),
      notes:
        `Natural gas driven pneumatic pumps, ${W1_NOTE_SUFFIX} ` +
        "NOTE: calculator.service.ts does not yet dispatch PNEUMATIC_PUMP " +
        "equipment -- seeded ahead of that feature.",
      federalRegCitation: W1_CITATION,
    },
  ];

  for (const { id, ...data } of rows) {
    await prisma.emissionFactor.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log("  \u2713 Seeded 4 ef-w1-* rows (Table W-1, verified)");

  const check = await prisma.emissionFactor.findMany({
    where: {
      equipmentCategory: { in: ["PNEUMATIC_CONTROLLER", "PNEUMATIC_PUMP"] },
    },
    select: {
      id: true,
      factorValue: true,
      factorUnit: true,
      subType: true,
      applicableFrom: true,
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
