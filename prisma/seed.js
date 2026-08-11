/**
 * FieldCompliance — Database Seed (plain JS, no TypeScript)
 * Run: node prisma/seed.js
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding FieldCompliance database...");

  // ============================================================
  // REGULATIONS
  // ============================================================

  const subpartW = await prisma.regulation.upsert({
    where: { code: "EPA_SUBPART_W" },
    update: {},
    create: {
      code: "EPA_SUBPART_W",
      title:
        "Mandatory Greenhouse Gas Reporting — Petroleum and Natural Gas Systems",
      jurisdiction: "FEDERAL_EPA",
      cfrPart: "40 CFR Part 98 Subpart W",
      federalRegisterUrl:
        "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-98/subpart-W",
      description:
        "Annual GHG reporting for petroleum and natural gas facilities emitting 25,000 mt CO2e/year or more.",
      isActive: true,
    },
  });

  const oooob = await prisma.regulation.upsert({
    where: { code: "EPA_OOOOb" },
    update: {},
    create: {
      code: "EPA_OOOOb",
      title:
        "Standards of Performance for New, Reconstructed, and Modified Sources — Oil and Natural Gas (OOOOb)",
      jurisdiction: "FEDERAL_EPA",
      cfrPart: "40 CFR Part 60 Subpart OOOOb",
      federalRegisterUrl:
        "https://www.federalregister.gov/documents/2024/03/08/2024-00338/standards-of-performance",
      description:
        "Emission standards for methane and VOC from oil and natural gas operations for sources constructed, " +
        "reconstructed, or modified after December 6, 2022.",
      isActive: true,
    },
  });

  const ooooC = await prisma.regulation.upsert({
    where: { code: "EPA_OOOOc" },
    update: {},
    create: {
      code: "EPA_OOOOc",
      title:
        "Emissions Guidelines for Existing Sources — Oil and Natural Gas (OOOOc)",
      jurisdiction: "FEDERAL_EPA",
      cfrPart: "40 CFR Part 111 Subpart OOOOc",
      federalRegisterUrl:
        "https://www.federalregister.gov/documents/2024/03/08/2024-00338/standards-of-performance",
      description: "Emission guidelines for existing oil and gas sources.",
      isActive: true,
    },
  });

  const tceq = await prisma.regulation.upsert({
    where: { code: "TEXAS_TCEQ_30TAC" },
    update: {},
    create: {
      code: "TEXAS_TCEQ_30TAC",
      title: "Texas TCEQ Air Quality Standards for Oil and Gas",
      jurisdiction: "TEXAS_TCEQ",
      cfrPart: "30 TAC Chapter 115 / Chapter 122",
      federalRegisterUrl: "https://www.tceq.texas.gov/rules/indxpdf.html",
      description: "Texas state air quality rules for oil and gas operations.",
      isActive: true,
    },
  });

  console.log("  ✓ Regulations created");

  // ============================================================
  // REGULATION VERSIONS
  // ============================================================

  const subpartWV2024 = await prisma.regulationVersion.upsert({
    where: { id: "reg-ver-subw-2024" },
    update: {},
    create: {
      id: "reg-ver-subw-2024",
      regulationId: subpartW.id,
      version: "2024-SubW",
      effectiveDate: new Date("2024-01-01"),
      changeNotes:
        "Updated calculation methodologies for pneumatic controllers and storage tanks per 2023 final rule.",
      rawJsonSchema: {
        reportingThreshold: { value: 25000, unit: "mt-CO2e/yr" },
        reportingDeadline: { month: 3, day: 31, offsetFromPeriodEnd: 90 },
        eggrtRequired: true,
      },
    },
  });

  const oooobV2024 = await prisma.regulationVersion.upsert({
    where: { id: "reg-ver-oooob-2024" },
    update: {},
    create: {
      id: "reg-ver-oooob-2024",
      regulationId: oooob.id,
      version: "2024-OOOOb",
      effectiveDate: new Date("2024-11-01"),
      changeNotes: "Final rule effective November 2024.",
      rawJsonSchema: {
        applicableSources: ["new", "reconstructed", "modified"],
        constructionCutoff: "2022-12-06",
      },
    },
  });

  console.log("  ✓ Regulation versions created");

  // ============================================================
  // REGULATION RULES
  // ============================================================

  const subWRules = [
    {
      ruleCode: "SUBW-ANNUAL-REPORT",
      title: "Annual GHG report submission to EPA e-GGRT",
      description:
        "Facilities emitting 25,000 mt CO2e/year or more must submit an annual GHG report via EPA e-GGRT by March 31.",
      equipmentCategory: null,
      emissionSource: null,
      requirementType: "SUBMIT",
      frequencyDays: 365,
      thresholdValue: 25000,
      thresholdUnit: "mt-CO2e/yr",
      deadlineOffsetDays: 90,
      penaltyPerDay: 70117,
      notes:
        "Penalty adjusted annually per inflation. Current value per 40 CFR Part 19.",
    },
    {
      ruleCode: "SUBW-PNEUMATIC-CALC",
      title: "Pneumatic controller emission calculation",
      description:
        "Calculate methane emissions from all pneumatic controllers using EPA-approved emission factors.",
      equipmentCategory: "PNEUMATIC_CONTROLLER",
      emissionSource: "VENTING",
      requirementType: "CALCULATE",
      frequencyDays: 365,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 90,
      penaltyPerDay: 70117,
      notes: "High-bleed: >6 scf/hr. Low-bleed: ≤6 scf/hr.",
    },
    {
      ruleCode: "SUBW-STORAGE-TANK-CALC",
      title: "Storage tank working and breathing loss calculation",
      description:
        "Calculate VOC and methane emissions from crude oil and condensate storage tanks.",
      equipmentCategory: "STORAGE_TANK",
      emissionSource: "VENTING",
      requirementType: "CALCULATE",
      frequencyDays: 365,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 90,
      penaltyPerDay: 70117,
      notes: "Use E&P TANK 2.0 or API 4697 methodology.",
    },
    {
      ruleCode: "SUBW-COMPRESSOR-SEAL",
      title: "Compressor seal and blowdown emission calculation",
      description:
        "Calculate methane emissions from compressor rod packing, seal vents, and blowdowns.",
      equipmentCategory: "COMPRESSOR_RECIPROCATING",
      emissionSource: "VENTING",
      requirementType: "CALCULATE",
      frequencyDays: 365,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 90,
      penaltyPerDay: 70117,
      notes: null,
    },
    {
      ruleCode: "SUBW-RECORD-RETENTION",
      title: "Record retention — 3 years minimum",
      description:
        "All data, calculations, methods, and reports must be retained for at least 3 years.",
      equipmentCategory: null,
      emissionSource: null,
      requirementType: "RECORD",
      frequencyDays: null,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: null,
      penaltyPerDay: 70117,
      notes:
        "Includes activity data, emission factors, and site-specific measurement data.",
    },
  ];

  for (const rule of subWRules) {
    await prisma.regulationRule.upsert({
      where: { id: `rule-subw-${rule.ruleCode}` },
      update: {},
      create: {
        id: `rule-subw-${rule.ruleCode}`,
        regulationVersionId: subpartWV2024.id,
        ...rule,
      },
    });
  }

  const oooobRules = [
    {
      ruleCode: "OOOOb-PC-ELIMINATION",
      title: "Pneumatic controller — eliminate continuous venting",
      description:
        "New/modified pneumatic controllers must have zero methane emissions or route to 95% control device.",
      equipmentCategory: "PNEUMATIC_CONTROLLER",
      emissionSource: "VENTING",
      requirementType: "RECORD",
      frequencyDays: null,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: null,
      penaltyPerDay: 70117,
      notes: "Instrument controllers ≤6 scf/hr may continue to vent.",
    },
    {
      ruleCode: "OOOOb-TANK-CONTROL",
      title: "Storage tank — 95% VOC control",
      description:
        "Storage tanks with potential VOC emissions ≥6 tpy must route vapors to a combustion control device.",
      equipmentCategory: "STORAGE_TANK",
      emissionSource: "VENTING",
      requirementType: "RECORD",
      frequencyDays: null,
      thresholdValue: 6,
      thresholdUnit: "tpy-VOC",
      deadlineOffsetDays: null,
      penaltyPerDay: 70117,
      notes: "VRU or enclosed combustor. Flares are not preferred controls.",
    },
    {
      ruleCode: "OOOOb-LDAR-QUARTERLY",
      title: "LDAR survey — quarterly OGI inspection",
      description:
        "Fugitive emission components must be surveyed quarterly using optical gas imaging (OGI) camera.",
      equipmentCategory: "FUGITIVE_COMPONENT",
      emissionSource: "FUGITIVE",
      requirementType: "SURVEY",
      frequencyDays: 90,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 30,
      penaltyPerDay: 70117,
      notes: "Must use EPA-certified OGI camera.",
    },
    {
      ruleCode: "OOOOb-LDAR-SEMIANNUAL-LOW",
      title: "LDAR survey — semi-annual OGI (low-production wells)",
      description:
        "Well sites producing ≤15 boe/day may conduct semi-annual OGI surveys.",
      equipmentCategory: "FUGITIVE_COMPONENT",
      emissionSource: "FUGITIVE",
      requirementType: "SURVEY",
      frequencyDays: 180,
      thresholdValue: 15,
      thresholdUnit: "boe/day",
      deadlineOffsetDays: 30,
      penaltyPerDay: 70117,
      notes: "Production threshold applies to prior calendar year average.",
    },
    {
      ruleCode: "OOOOb-LDAR-REPAIR",
      title: "LDAR — leak repair within 30 days",
      description:
        "Detected leaks must be repaired within 30 days of detection.",
      equipmentCategory: "FUGITIVE_COMPONENT",
      emissionSource: "FUGITIVE",
      requirementType: "RECORD",
      frequencyDays: null,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 30,
      penaltyPerDay: 70117,
      notes: "Re-survey required within 30 days of repair.",
    },
    {
      ruleCode: "OOOOb-WELL-COMPLETION",
      title: "Well completion — green completions required",
      description:
        "Hydraulic fracturing completions must use reduced emission completion (REC) to capture flowback gas.",
      equipmentCategory: "WELLHEAD",
      emissionSource: "VENTING",
      requirementType: "RECORD",
      frequencyDays: null,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 30,
      penaltyPerDay: 70117,
      notes: "Flaring exemption requires prior notification.",
    },
    {
      ruleCode: "OOOOb-ANNUAL-REPORT",
      title: "Annual compliance report",
      description:
        "Annual report documenting surveys, leaks found/repaired, equipment counts, and control device performance.",
      equipmentCategory: null,
      emissionSource: null,
      requirementType: "SUBMIT",
      frequencyDays: 365,
      thresholdValue: null,
      thresholdUnit: null,
      deadlineOffsetDays: 90,
      penaltyPerDay: 70117,
      notes: "Due March 31 for prior calendar year.",
    },
  ];

  for (const rule of oooobRules) {
    await prisma.regulationRule.upsert({
      where: { id: `rule-oooob-${rule.ruleCode}` },
      update: {},
      create: {
        id: `rule-oooob-${rule.ruleCode}`,
        regulationVersionId: oooobV2024.id,
        ...rule,
      },
    });
  }

  console.log("  ✓ Regulation rules seeded (Subpart W + OOOOb)");

  // ============================================================
  // EMISSION FACTORS
  // ============================================================
  //
  // 2026-07-29 CORRECTION: the original ef-seed-0 (high bleed, 0.174
  // "scf-CH4/hr") and ef-seed-1 (low bleed, 0.0017 "scf-CH4/hr") were
  // fabricated — they never matched any EPA table (current Table W-1,
  // pre-2024 Table W-1A, or AP-42). They are EXPIRED below (not deleted
  // or mutated: EmissionRecord.emissionFactorId may reference them, and
  // the provenance chain must keep showing what was actually used) and
  // replaced by the ef-w1-* rows verified against the current eCFR text
  // of Table W-1 to Subpart W (89 FR 42323, May 14 2024).

  await prisma.emissionFactor.updateMany({
    where: { id: { in: ["ef-seed-0", "ef-seed-1"] }, applicableUntil: null },
    data: { applicableUntil: new Date("2026-07-29T00:00:00Z") },
  });

  const W1_CITATION = "40 CFR Part 98 Table W-1 (89 FR 42323)";
  const W1_NOTE_SUFFIX =
    "onshore production / gathering & boosting. WHOLE GAS factor — " +
    "multiply by facility CH4 mole fraction per Eq. W-1B.";

  const emissionFactors = [
    // ---- Subpart W Table W-1 pneumatic factors (verified 2026-07-29) ----
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
        "equipment — seeded ahead of that feature.",
      federalRegCitation: W1_CITATION,
    },
    // ---- Legacy factors (unchanged values; explicit ids keep them ----
    // ---- stable now that the upsert loop actively updates rows)    ----
    {
      id: "ef-seed-3",
      source: "AP42",
      equipmentCategory: "COMPRESSOR_RECIPROCATING",
      pollutant: "CH4",
      subType: null,
      factorValue: 0.00228,
      factorUnit: "scf-CH4/hr/cylinder",
      applicableFrom: new Date("2014-01-01"),
      notes:
        "Vented rod packing emissions per compressor cylinder. AP-42 Section 3.2.",
      federalRegCitation: "40 CFR Part 98 Table W-7",
    },
    {
      id: "ef-seed-4",
      source: "AP42",
      equipmentCategory: "DEHYDRATOR_GLYCOL",
      pollutant: "CH4",
      subType: null,
      factorValue: 33.5,
      factorUnit: "scf-CH4/hr",
      applicableFrom: new Date("2014-01-01"),
      notes: "TEG dehydrator still vent emissions. Site measurement preferred.",
      federalRegCitation: "40 CFR Part 98 Table W-9",
    },
    {
      id: "ef-seed-5",
      source: "AP42",
      equipmentCategory: "STORAGE_TANK",
      pollutant: "VOC",
      subType: null,
      factorValue: 1.86,
      factorUnit: "lb-VOC/bbl",
      applicableFrom: new Date("2014-01-01"),
      notes:
        "Condensate storage tank working and breathing losses. Use E&P TANK for site-specific calc.",
      federalRegCitation: "40 CFR Part 98 Table W-10",
    },
    {
      id: "ef-seed-6",
      source: "OOOOb",
      equipmentCategory: "WELLHEAD",
      pollutant: "CH4",
      subType: null,
      factorValue: 5500,
      factorUnit: "scf-CH4/completion",
      applicableFrom: new Date("2024-11-01"),
      notes:
        "Default flowback emission factor for hydraulic fracturing completions.",
      federalRegCitation: "40 CFR Part 60 §60.5430b",
    },
  ];

  // Corrective upsert: `update` carries the full payload so re-running the
  // seed FIXES drifted rows instead of silently skipping them (the old
  // loop used `update: {}` — which is why re-seeding never corrected the
  // fabricated values in existing databases).
  for (const { id, ...data } of emissionFactors) {
    await prisma.emissionFactor.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  console.log(
    "  ✓ Emission factors seeded (Subpart W Table W-1 + AP-42 + OOOOb; fabricated rows expired)",
  );

  // ============================================================
  // SAMPLE ORG + USER
  // ============================================================

  let sampleOrg, adminUser;
  await prisma.$transaction(async (tx) => {
    // RLS is enforced on every tenant table. Without this line, every
    // write below silently affects 0 rows instead of throwing.
    await tx.$executeRaw`SELECT set_config('app.system_mode', 'on', true)`;

  sampleOrg = await tx.organization.upsert({
    where: { slug: "lone-star-e-and-p" },
    update: {},
    create: {
      name: "Lone Star E&P LLC",
      slug: "lone-star-e-and-p",
      epaReporterCode: "TX-LSTAR-001",
      billingEmail: "admin@lonestarep.example.com",
      planTier: "growth",
      maxFacilities: 50,
    },
  });

  const seedPassword = process.env.SEED_ADMIN_PASSWORD || "Localdev123!";
  const adminPasswordHash = await bcrypt.hash(seedPassword, 12);
  adminUser = await tx.user.upsert({
    where: { email: "admin@lonestarep.example.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      orgId: sampleOrg.id,
      email: "admin@lonestarep.example.com",
      passwordHash: adminPasswordHash,
      firstName: "Sample",
      lastName: "Admin",
      role: "ORG_ADMIN",
    },
  });

  await tx.orgRegulation.upsert({
    where: {
      orgId_regulationId: { orgId: sampleOrg.id, regulationId: subpartW.id },
    },
    update: {},
    create: {
      orgId: sampleOrg.id,
      regulationId: subpartW.id,
      enrolledBy: adminUser.id,
    },
  });

  await tx.orgRegulation.upsert({
    where: {
      orgId_regulationId: { orgId: sampleOrg.id, regulationId: oooob.id },
    },
    update: {},
    create: {
      orgId: sampleOrg.id,
      regulationId: oooob.id,
      enrolledBy: adminUser.id,
    },
  });

  // Gas composition is set in BOTH update and create so re-seeding an
  // existing dev database backfills the new §98.233(u)(2) fields.
  const facility1 = await tx.facility.upsert({
    where: { id: "fac-sample-001" },
    update: {
      ch4MoleFraction: 0.85,
      co2MoleFraction: 0.02,
    },
    create: {
      id: "fac-sample-001",
      orgId: sampleOrg.id,
      name: "Midland Basin Pad A",
      type: "PRODUCTION_WELL",
      apiWellNumber: "42-329-12345-0000",
      state: "TX",
      county: "Midland",
      latitude: 31.9974,
      longitude: -102.0779,
      commissionedAt: new Date("2023-03-15"),
      ch4MoleFraction: 0.85,
      co2MoleFraction: 0.02,
    },
  });

  await tx.equipment.upsert({
    where: { facilityId_tag: { facilityId: facility1.id, tag: "PC-101" } },
    update: {},
    create: {
      facilityId: facility1.id,
      tag: "PC-101",
      category: "PNEUMATIC_CONTROLLER",
      description: "High-bleed pneumatic level controller — separator",
      manufacturer: "Fisher",
      pneumaticType: "CONTINUOUS_HIGH_BLEED",
      installDate: new Date("2023-03-15"),
    },
  });

  await tx.equipment.upsert({
    where: { facilityId_tag: { facilityId: facility1.id, tag: "ST-101" } },
    update: {},
    create: {
      facilityId: facility1.id,
      tag: "ST-101",
      category: "STORAGE_TANK",
      description: "Crude oil storage tank — 400 bbl",
      tankCapacityBbls: 400,
      installDate: new Date("2023-03-15"),
    },
  });

  await tx.equipment.upsert({
    where: { facilityId_tag: { facilityId: facility1.id, tag: "SEP-101" } },
    update: {},
    create: {
      facilityId: facility1.id,
      tag: "SEP-101",
      category: "SEPARATOR",
      description: "Three-phase horizontal separator",
      installDate: new Date("2023-03-15"),
    },
  });

  const nextMarch31 = new Date(new Date().getFullYear() + 1, 2, 31);
  await tx.deadline.upsert({
    where: { id: "deadline-sample-001" },
    update: {},
    create: {
      id: "deadline-sample-001",
      orgId: sampleOrg.id,
      facilityId: facility1.id,
      regulationVersionId: subpartWV2024.id,
      ruleCode: "SUBW-ANNUAL-REPORT",
      title: "40 CFR Part 98 Subpart W — Annual GHG Report",
      description:
        "Annual GHG report to EPA e-GGRT for prior calendar year. Due March 31.",
      dueDate: nextMarch31,
      periodStart: new Date(new Date().getFullYear(), 0, 1),
      periodEnd: new Date(new Date().getFullYear(), 11, 31),
      status: "PENDING",
      assignedUserId: adminUser.id,
    },
  });
  });

  console.log("  ✓ Sample org, facilities, equipment, and deadline created");
  console.log("\nSeed complete.");
  console.log(`  Org: ${sampleOrg.name} (slug: ${sampleOrg.slug})`);
  console.log(`  Admin: ${adminUser.email}`);
  console.log(`  Regulations enrolled: Subpart W + OOOOb`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
