/**
 * Spec for the rewritten pneumatic methodology (Eq. W-1B, Table W-1
 * whole-gas factors). Place alongside pneumatic.ts or fold into
 * calculator.spec.ts — methodology functions are pure, no Prisma needed.
 *
 * Expected values assume units.ts uses the §98.233(v) densities
 * (CH4_KG_PER_SCF = 0.0192). If you kept 0.01926, expectations shift +0.3%.
 */
import { calculatePneumatic, WHOLE_GAS_FACTOR_UNIT } from './methodologies/pneumatic'

const FULL_YEAR = 8760
const CH4_FRACTION = 0.85

const factorRow = (id: string, factorValue: number) => ({
  id,
  factorValue,
  factorUnit: WHOLE_GAS_FACTOR_UNIT,
  source: 'SUBPART_W',
})

describe('calculatePneumatic — Eq. W-1B with Table W-1 whole-gas factors', () => {
  it('high bleed (PC-101 scenario): 1 device, full year, 0.85 CH4 → 84.06 mt CO2e', () => {
    const r = calculatePneumatic({
      equipmentId: 'eq-1',
      equipmentTag: 'PC-101',
      pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: FULL_YEAR,
      ch4MoleFraction: CH4_FRACTION,
      factor: factorRow('ef-w1-high-bleed', 21),
    })
    expect(r.activityData.scfWholeGas).toBeCloseTo(183_960, 0)
    expect(r.activityData.scfCh4).toBeCloseTo(156_366, 0)
    expect(r.quantityMetricTons).toBeCloseTo(3.002227, 5)
    expect(r.co2Equivalent).toBeCloseTo(84.0624, 3)
    expect(r.emissionFactorId).toBe('ef-w1-high-bleed')
  })

  it('low bleed: 1 device, full year → 27.22 mt CO2e', () => {
    const r = calculatePneumatic({
      equipmentId: 'eq-2',
      equipmentTag: 'PC-102',
      pneumaticType: 'CONTINUOUS_LOW_BLEED',
      hoursOperated: FULL_YEAR,
      ch4MoleFraction: CH4_FRACTION,
      factor: factorRow('ef-w1-low-bleed', 6.8),
    })
    expect(r.quantityMetricTons).toBeCloseTo(0.97215, 4)
    expect(r.co2Equivalent).toBeCloseTo(27.2202, 3)
  })

  it('intermittent bleed: 1 device, full year → 35.23 mt CO2e', () => {
    const r = calculatePneumatic({
      equipmentId: 'eq-3',
      equipmentTag: 'PC-103',
      pneumaticType: 'INTERMITTENT_BLEED',
      hoursOperated: FULL_YEAR,
      ch4MoleFraction: CH4_FRACTION,
      factor: factorRow('ef-w1-intermittent', 8.8),
    })
    expect(r.quantityMetricTons).toBeCloseTo(1.258076, 5)
    expect(r.co2Equivalent).toBeCloseTo(35.2261, 3)
  })

  it('scales linearly with deviceCount and hours', () => {
    const base = calculatePneumatic({
      equipmentId: 'eq-4',
      equipmentTag: 'PC-104',
      pneumaticType: 'INTERMITTENT_BLEED',
      hoursOperated: FULL_YEAR,
      ch4MoleFraction: CH4_FRACTION,
      factor: factorRow('f', 8.8),
    })
    const tripleHalfYear = calculatePneumatic({
      equipmentId: 'eq-4',
      equipmentTag: 'PC-104',
      pneumaticType: 'INTERMITTENT_BLEED',
      hoursOperated: FULL_YEAR / 2,
      deviceCount: 3,
      ch4MoleFraction: CH4_FRACTION,
      factor: factorRow('f', 8.8),
    })
    expect(tripleHalfYear.co2Equivalent).toBeCloseTo(base.co2Equivalent * 1.5, 6)
  })

  it('applies the mole fraction (whole gas ≠ CH4)', () => {
    const at100 = calculatePneumatic({
      equipmentId: 'e', equipmentTag: 't',
      pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: 1000, ch4MoleFraction: 1,
      factor: factorRow('f', 21),
    })
    const at50 = calculatePneumatic({
      equipmentId: 'e', equipmentTag: 't',
      pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: 1000, ch4MoleFraction: 0.5,
      factor: factorRow('f', 21),
    })
    expect(at50.co2Equivalent).toBeCloseTo(at100.co2Equivalent / 2, 8)
  })

  it('records assumed composition in activityData for provenance', () => {
    const r = calculatePneumatic({
      equipmentId: 'e', equipmentTag: 't',
      pneumaticType: 'CONTINUOUS_LOW_BLEED',
      hoursOperated: 100, ch4MoleFraction: 0.85,
      isCompositionAssumed: true,
      factor: factorRow('f', 6.8),
    })
    expect(r.activityData.assumedComposition).toBe(true)
    expect(r.notes).toContain('platform default')
  })

  it('REGRESSION GUARD: hard-fails on legacy scf-CH4/hr factor rows', () => {
    // The fabricated ef-seed-0/ef-seed-1 rows carried this unit. If they
    // ever come back (bad seed, stale DB), the calc must throw — never
    // silently produce a 0.822-style number again.
    expect(() =>
      calculatePneumatic({
        equipmentId: 'e', equipmentTag: 't',
        pneumaticType: 'CONTINUOUS_HIGH_BLEED',
        hoursOperated: FULL_YEAR, ch4MoleFraction: CH4_FRACTION,
        factor: { id: 'ef-seed-0', factorValue: 0.174, factorUnit: 'scf-CH4/hr', source: 'AP42' },
      }),
    ).toThrow(/scf-whole-gas\/hr/)
  })

  it('rejects out-of-range mole fractions', () => {
    for (const bad of [0, -0.1, 1.2]) {
      expect(() =>
        calculatePneumatic({
          equipmentId: 'e', equipmentTag: 't',
          pneumaticType: 'CONTINUOUS_LOW_BLEED',
          hoursOperated: 100, ch4MoleFraction: bad,
          factor: factorRow('f', 6.8),
        }),
      ).toThrow(/ch4MoleFraction/)
    }
  })
})
