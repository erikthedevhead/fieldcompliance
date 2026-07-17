#!/usr/bin/env node
/**
 * RLS Isolation Test
 *
 * Creates two orgs, each with a facility, then attempts to access
 * Org A's data while scoped to Org B. If RLS is working correctly,
 * every cross-tenant read returns 0 rows.
 *
 * Run against a database with RLS enabled and BYPASSRLS revoked from
 * the connecting user.
 *
 * Usage:
 *   node scripts/test-rls-isolation.js
 */

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const results = []
function assert(name, condition, detail) {
  results.push({ name, pass: !!condition, detail })
  const symbol = condition ? '✓' : '✗'
  console.log(`  ${symbol} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function asSystem(fn) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.system_mode', 'on', true)`
    return fn(tx)
  })
}

async function asOrg(orgId, fn) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.current_org', ${orgId}, true)`
    return fn(tx)
  })
}

async function main() {
  console.log('\nRLS Isolation Test\n' + '='.repeat(50))

  // Setup — two fresh orgs with distinct data
  console.log('\n[setup] Creating two orgs with test facilities…')
  const { orgA, orgB } = await asSystem(async tx => {
    // Clean up any previous test run
    await tx.facility.deleteMany({
      where: { name: { in: ['RLS Test Facility A', 'RLS Test Facility B'] } },
    })
    await tx.organization.deleteMany({
      where: { slug: { in: ['rls-test-a', 'rls-test-b'] } },
    })

    const orgA = await tx.organization.create({
      data: {
        name: 'RLS Test Org A',
        slug: 'rls-test-a',
        billingEmail: 'a@rls-test.example',
        planTier: 'starter',
        maxFacilities: 10,
      },
    })
    const orgB = await tx.organization.create({
      data: {
        name: 'RLS Test Org B',
        slug: 'rls-test-b',
        billingEmail: 'b@rls-test.example',
        planTier: 'starter',
        maxFacilities: 10,
      },
    })
    await tx.facility.create({
      data: { orgId: orgA.id, name: 'RLS Test Facility A', type: 'PRODUCTION_WELL', state: 'TX' },
    })
    await tx.facility.create({
      data: { orgId: orgB.id, name: 'RLS Test Facility B', type: 'PRODUCTION_WELL', state: 'NM' },
    })
    return { orgA, orgB }
  })

  console.log(`  orgA: ${orgA.id}`)
  console.log(`  orgB: ${orgB.id}`)

  // Test 1 — no session var set: tenant tables should be inaccessible
  console.log('\n[test 1] Query without context returns no tenant rows')
  const noContextFacilities = await prisma.facility.findMany({ take: 5 })
  assert(
    'No-context query returns 0 facilities',
    noContextFacilities.length === 0,
    `got ${noContextFacilities.length}`,
  )

  // Test 2 — asOrg(A) sees only A's data
  console.log("\n[test 2] asOrg(A) sees only A's facilities")
  const asOrgAFacilities = await asOrg(orgA.id, tx => tx.facility.findMany())
  assert(
    'asOrg(A) sees A facility',
    asOrgAFacilities.some(f => f.name === 'RLS Test Facility A'),
  )
  assert(
    'asOrg(A) does NOT see B facility',
    !asOrgAFacilities.some(f => f.name === 'RLS Test Facility B'),
  )

  // Test 3 — asOrg(B) sees only B's data
  console.log("\n[test 3] asOrg(B) sees only B's facilities")
  const asOrgBFacilities = await asOrg(orgB.id, tx => tx.facility.findMany())
  assert(
    'asOrg(B) sees B facility',
    asOrgBFacilities.some(f => f.name === 'RLS Test Facility B'),
  )
  assert(
    'asOrg(B) does NOT see A facility',
    !asOrgBFacilities.some(f => f.name === 'RLS Test Facility A'),
  )

  // Test 4 — asOrg(A) cannot UPDATE B's facility even with explicit ID
  console.log("\n[test 4] asOrg(A) cannot mutate B's data even with direct ID")
  const bFacility = asOrgBFacilities.find(f => f.name === 'RLS Test Facility B')
  let updateFailedAsExpected = false
  try {
    const updated = await asOrg(orgA.id, tx =>
      tx.facility.update({
        where: { id: bFacility.id },
        data: { state: 'HACKED' },
      }),
    )
    if (!updated) updateFailedAsExpected = true
  } catch (err) {
    // Expected: RecordNotFound because RLS hides the row
    updateFailedAsExpected = /not found|no records/i.test(err.message)
  }
  assert('Cross-tenant UPDATE by direct ID rejected', updateFailedAsExpected)

  // Test 5 — asSystem bypasses correctly (needed for cleanup)
  console.log('\n[test 5] asSystem sees both orgs (trusted bypass)')
  const allFacilities = await asSystem(tx =>
    tx.facility.findMany({
      where: { name: { in: ['RLS Test Facility A', 'RLS Test Facility B'] } },
    }),
  )
  assert('asSystem sees both test facilities', allFacilities.length === 2)

  // Cleanup
  console.log('\n[cleanup] Removing test data…')
  await asSystem(async tx => {
    await tx.facility.deleteMany({
      where: { name: { in: ['RLS Test Facility A', 'RLS Test Facility B'] } },
    })
    await tx.organization.deleteMany({
      where: { slug: { in: ['rls-test-a', 'rls-test-b'] } },
    })
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  const failed = results.filter(r => !r.pass)
  if (failed.length === 0) {
    console.log(`✓ All ${results.length} checks passed. RLS is enforcing tenant isolation.\n`)
    process.exit(0)
  } else {
    console.log(`✗ ${failed.length}/${results.length} checks failed:`)
    failed.forEach(f => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`))
    console.log()
    process.exit(1)
  }
}

main()
  .catch(err => {
    console.error('\nTest run crashed:', err)
    process.exit(2)
  })
  .finally(() => prisma.$disconnect())
