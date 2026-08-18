/**
 * FieldCompliance — Narrow prod correction: compressor + storage tank factors.
 *
 * 1. Expires ef-seed-3 (fabricated 0.00228 scf-CH4/hr/cylinder rod packing
 *    factor citing "Table W-7" — W-7 is internal combustion methane slip,
 *    not rod packing). Understated a full-year compressor by ~4,650x.
 * 2. Expires ef-seed-5 (fabricated 1.86 lb-VOC/bbl tank factor citing the
 *    nonexistent "Table W-10"; Subpart W tanks are CH4/CO2, not VOC).
 *    Tanks will warn-and-skip until Method 3 (W-15A/W-15B) is built.
 * 3. Seeds the verified W-29E rod packing factors (§98.233(p)(10)(iv)).
 *
 * Verified against live eCFR 2026-08-17.
 *
 * Run: node prisma/fix-compressor-factors.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CITATION = "40 CFR 98.233(p)(10)(iv), Equation W-29E (89 FR 42323)";
const NOTE =
  "Reciprocating compressor rod packing, onshore production / gathering & " +
  "boosting. Annual per-compressor factor -- scale by operating-mode hours " +
  "and normalize composition by GHGEF (0.98 CH4 / 0.02 CO2) per Eq. W-29E. " +
  "Applies ONLY to compressors not subject to 60.5385b measurement and " +
  "venting directly to atmosphere.";

async function main() {
  console.log("Correcting compressor + tank EmissionFactor rows...");

  const expired = await prisma.emissionFactor.updateMany({
    where: { id: { in: ["ef-seed-3", "ef-seed-5"] }, applicableUntil: null },
    data: { applicableUntil: new Date() },
  });
  console.log(`  \u2713 Expired ${expired.count} fabricated row(s): ef-seed-3 (compressor), ef-seed-5 (tank VOC)`);

  const rows = [
    {
      id: "ef-w29e-recip-ch4",
      source: "SUBPART_W",
      equipmentCategory: "COMPRESSOR_RECIPROCATING",
      pollutant: "CH4",
      subType: "ROD_PACKING_CH4",
      factorValue: 213000,
      factorUnit: "scf-GHG/yr/compressor",
      applicableFrom: new Date("2025-01-01"),
      notes: NOTE,
      federalRegCitation: CITATION,
    },
    {
      id: "ef-w29e-recip-co2",
      source: "SUBPART_W",
      equipmentCategory: "COMPRESSOR_RECIPROCATING",
      pollutant: "CO2",
      subType: "ROD_PACKING_CO2",
      factorValue: 11800,
      factorUnit: "scf-GHG/yr/compressor",
      applicableFrom: new Date("2025-01-01"),
      notes: NOTE,
      federalRegCitation: CITATION,
    },
  ];

  for (const { id, ...data } of rows) {
    await prisma.emissionFactor.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }
  console.log("  \u2713 Seeded 2 ef-w29e-* rows (Eq. W-29E rod packing)");

  const check = await prisma.emissionFactor.findMany({
    where: {
      equipmentCategory: { in: ["COMPRESSOR_RECIPROCATING", "STORAGE_TANK"] },
    },
    select: {
      id: true,
      pollutant: true,
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
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
