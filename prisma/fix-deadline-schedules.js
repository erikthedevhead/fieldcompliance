/**
 * FieldCompliance — classify regulation rules by schedule type and clear
 * deadlines generated under the old rolling-interval logic.
 *
 * Annual reports were being scheduled 365 days after facility
 * commissioning instead of on their statutory calendar date, producing
 * due dates like 2027-03-14 covering a rolling 2025-12-14 -> 2026-12-14
 * window rather than a reporting year.
 *
 * Deleting PENDING deadlines is safe: the 6 AM generator recreates them,
 * now with correct dates. COMPLETED and WAIVED rows are never touched --
 * they are compliance history.
 *
 *   node prisma/fix-deadline-schedules.js            # dry run
 *   node prisma/fix-deadline-schedules.js --commit
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const COMMIT = process.argv.includes("--commit");

/**
 * Annual report obligations: fixed calendar date, full-calendar-year
 * reporting period. March 31 per 40 CFR 98.3(b) / 60.5420b.
 *
 * NOTE: EPA postponed RY2025 Subpart W reporting to October. That is a
 * one-off against a moving rulemaking, so the structural date stays
 * March 31 here; change fixedDueMonth/fixedDueDay if it becomes settled.
 */
const FIXED_ANNUAL = [
  "SUBW-ANNUAL-REPORT",
  "SUBW-PNEUMATIC-CALC",
  "SUBW-STORAGE-TANK-CALC",
  "SUBW-COMPRESSOR-SEAL",
  "OOOOb-ANNUAL-REPORT",
];

async function main() {
  const rules = await prisma.regulationRule.findMany({
    select: { id: true, ruleCode: true, scheduleType: true, frequencyDays: true },
  });

  const toFix = rules.filter(
    (r) => FIXED_ANNUAL.includes(r.ruleCode) && r.scheduleType !== "FIXED_ANNUAL",
  );
  const rolling = rules.filter((r) => !FIXED_ANNUAL.includes(r.ruleCode));

  console.log(`${rules.length} rules total`);
  console.log(`  ${toFix.length} to reclassify as FIXED_ANNUAL (due Mar 31):`);
  for (const r of toFix) console.log(`    ${r.ruleCode}`);
  console.log(`  ${rolling.length} staying ROLLING_INTERVAL:`);
  for (const r of rolling)
    console.log(`    ${r.ruleCode}${r.frequencyDays ? "" : "  (no frequency - not generated)"}`);

  const stale = await prisma.deadline.findMany({
    where: {
      ruleCode: { in: FIXED_ANNUAL },
      status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
    },
    select: { id: true, ruleCode: true, dueDate: true, periodStart: true, status: true },
  });
  console.log(`\n${stale.length} open deadlines to delete and regenerate:`);
  for (const d of stale) {
    console.log(
      `    ${d.ruleCode.padEnd(24)} due ${d.dueDate.toISOString().slice(0, 10)}` +
        `  period from ${d.periodStart ? d.periodStart.toISOString().slice(0, 10) : "-"}  [${d.status}]`,
    );
  }

  const protectedCount = await prisma.deadline.count({
    where: { status: { in: ["COMPLETED", "WAIVED"] } },
  });
  console.log(`\n${protectedCount} COMPLETED/WAIVED deadlines will NOT be touched.`);

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit.");
    return;
  }

  for (const r of toFix) {
    await prisma.regulationRule.update({
      where: { id: r.id },
      data: { scheduleType: "FIXED_ANNUAL", fixedDueMonth: 3, fixedDueDay: 31 },
    });
  }
  console.log(`\n  \u2713 Reclassified ${toFix.length} rules`);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.system_mode', 'on', true)`;
    const del = await tx.deadline.deleteMany({
      where: {
        ruleCode: { in: FIXED_ANNUAL },
        status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
      },
    });
    console.log(`  \u2713 Deleted ${del.count} stale open deadlines`);
  });

  console.log(
    "\nRegenerate with: POST /deadlines/generate (or wait for the 6 AM cron).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
