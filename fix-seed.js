#!/usr/bin/env node
/**
 * One-time fix script for prisma/seed.js:
 *
 *   1. Wraps the sample-org/user/facility/equipment/deadline writes in a
 *      transaction with app.system_mode set, so the seed script works
 *      against an RLS-enforced database. Without this, every write in
 *      that block would silently affect 0 rows instead of throwing —
 *      exactly what happened with the pneumatic-enum migration earlier.
 *
 *   2. Makes the sample admin password configurable via a
 *      SEED_ADMIN_PASSWORD env var, instead of only ever being the
 *      hardcoded default that's sitting in a public repo.
 *
 * Run once from the repo root:
 *   node fix-seed.js
 *
 * Then review the diff and delete this script:
 *   git diff prisma/seed.js
 *   rm fix-seed.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'prisma', 'seed.js');
let content = fs.readFileSync(filePath, 'utf8');

function mustReplace(label, oldText, newText) {
  if (!content.includes(oldText)) {
    throw new Error(
      `Anchor "${label}" not found in prisma/seed.js — the file may have ` +
        `changed since this script was written. Aborting without making ` +
        `any changes.`,
    );
  }
  content = content.split(oldText).join(newText);
  console.log(`  ✓ ${label}`);
}

console.log('Patching prisma/seed.js...\n');

// --- 1. Configurable password ---
mustReplace(
  'Configurable seed password',
  `  const adminPasswordHash = await bcrypt.hash("Localdev123!", 12);`,
  `  const seedPassword = process.env.SEED_ADMIN_PASSWORD || "Localdev123!";
  const adminPasswordHash = await bcrypt.hash(seedPassword, 12);`,
);

// --- 2. Open the transaction wrapper, right before the org upsert ---
mustReplace(
  'Open RLS transaction wrapper',
  `  const sampleOrg = await prisma.organization.upsert({`,
  `  await prisma.$transaction(async (tx) => {
    // RLS is enforced on every tenant table. Without this line, every
    // write below silently affects 0 rows instead of throwing.
    await tx.$executeRaw\`SELECT set_config('app.system_mode', 'on', true)\`;

  const sampleOrg = await tx.organization.upsert({`,
);

// --- 3. Swap remaining prisma.<model>.upsert calls to tx.<model>.upsert ---
// Safe as a global replace: grep confirmed these exact tokens appear
// nowhere else in the file.
const modelSwaps = ['user', 'orgRegulation', 'facility', 'equipment', 'deadline'];
for (const model of modelSwaps) {
  const before = content;
  const re = new RegExp(`prisma\\.${model}\\.upsert`, 'g');
  content = content.replace(re, `tx.${model}.upsert`);
  const count = (before.match(re) || []).length;
  console.log(`  ✓ Swapped ${count} occurrence(s) of prisma.${model}.upsert -> tx.${model}.upsert`);
}

// --- 4. Close the transaction wrapper, right after the deadline upsert ---
mustReplace(
  'Close RLS transaction wrapper',
  `      status: "PENDING",
      assignedUserId: adminUser.id,
    },
  });

  console.log("  ✓ Sample org, facilities, equipment, and deadline created");`,
  `      status: "PENDING",
      assignedUserId: adminUser.id,
    },
  });
  });

  console.log("  ✓ Sample org, facilities, equipment, and deadline created");`,
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✓ prisma/seed.js updated successfully.');
console.log('  Next: review with `git diff prisma/seed.js`, then run `node prisma/seed.js` to verify.');
