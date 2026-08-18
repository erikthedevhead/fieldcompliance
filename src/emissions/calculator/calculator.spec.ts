/**
 * Unit tests for emission calculator methodologies.
 *
 * Every test pins a known input to a regulator-defensible output value.
 * These are the firewall against silent math regressions — if EPA publishes
 * new factors or methodologies and we update factor tables, these tests
 * must be reviewed alongside the change.
 *
 * Tolerance: ±0.5% on intermediate values, ±0.1% on final mt CO2e.
 * (Slightly looser than NIST physical constants — accounts for rounding
 * in published EPA factor tables.)
 */

import {
  CH4_KG_PER_SCF,
  GWP,
  HOURS_PER_YEAR,
  scfToKg,
  lbToKg,
  kgToMetricTons,
  shortToMetricTons,
  toCo2Equivalent,
  fractionOfYear,
  hoursBetween,
} from './units'
import { calculatePneumatic } from './methodologies/pneumatic'
import { calculateStorageTank } from './methodologies/storage-tank'
// ============================================================
// Test factor fixtures matching the seeded DB rows
// ============================================================

const pneumaticHighBleed = {
  id: 'ef-w1-high-bleed',
  factorValue: 21,
  factorUnit: 'scf-whole-gas/hr',
  source: 'SUBPART_W',
}

const pneumaticLowBleed = {
  id: 'ef-w1-low-bleed',
  factorValue: 6.8,
  factorUnit: 'scf-whole-gas/hr',
  source: 'SUBPART_W',
}

const DEFAULT_TEST_CH4_FRACTION = 0.85

const tankVoc = {
  id: 'ef-seed-5',
  factorValue: 1.86,
  factorUnit: 'lb-VOC/bbl',
  source: 'AP42',
}

const fullYear2025 = {
  start: new Date('2025-01-01T00:00:00Z'),
  end: new Date('2026-01-01T00:00:00Z'),
}

// ============================================================
// UNIT CONVERSIONS
// ============================================================

describe('units', () => {
  test('CH4 density matches 40 CFR 98.233(v) conversion constant', () => {
    expect(CH4_KG_PER_SCF).toBeCloseTo(0.0192, 4)
  })

  test('GWP for CH4 is AR5 100-year (28)', () => {
    expect(GWP.CH4).toBe(28)
  })

  test('GWP for N2O is AR5 100-year (265)', () => {
    expect(GWP.N2O).toBe(265)
  })

  test('VOC has no GWP (tracked as non-GHG)', () => {
    expect(GWP.VOC).toBe(0)
  })

  test('scfToKg for methane', () => {
    expect(scfToKg(1000, 'CH4')).toBeCloseTo(19.2, 2)
  })

  test('lbToKg', () => {
    expect(lbToKg(100)).toBeCloseTo(45.359, 2)
  })

  test('kgToMetricTons', () => {
    expect(kgToMetricTons(1000)).toBe(1)
    expect(kgToMetricTons(2500)).toBe(2.5)
  })

  test('shortToMetricTons', () => {
    expect(shortToMetricTons(1)).toBeCloseTo(0.9072, 3)
  })

  test('toCo2Equivalent applies GWP', () => {
    expect(toCo2Equivalent(1, 'CH4')).toBe(28)
    expect(toCo2Equivalent(1, 'CO2')).toBe(1)
    expect(toCo2Equivalent(0.5, 'N2O')).toBe(132.5)
  })

  test('fractionOfYear for a full calendar year ≈ 1.0', () => {
    expect(fractionOfYear(fullYear2025.start, fullYear2025.end)).toBeCloseTo(1.0, 2)
  })

  test('fractionOfYear for Q1 ≈ 0.25', () => {
    const q1End = new Date('2025-04-01T00:00:00Z')
    expect(fractionOfYear(fullYear2025.start, q1End)).toBeCloseTo(0.247, 2)
  })

  test('hoursBetween for a full year ≈ 8760', () => {
    expect(hoursBetween(fullYear2025.start, fullYear2025.end)).toBeCloseTo(HOURS_PER_YEAR, 0)
  })
})

// ============================================================
// PNEUMATIC CONTROLLER
// ============================================================

describe('calculatePneumatic', () => {
  test('high-bleed controller, full year, matches Table W-1 worked example', () => {
    // Reference calc (40 CFR 98 Table W-1, 89 FR 42323; whole-gas factor):
    //   21 scf whole gas/hr × 8760 hr = 183,960 scf whole gas
    //   × 0.85 CH4 mole fraction = 156,366 scf CH4
    //   156,366 × 0.0192 kg/scf = 3002.2272 kg = 3.0022272 mt CH4
    //   × 28 GWP = 84.0624 mt CO2e
    const result = calculatePneumatic({
      equipmentId: 'eq-1',
      equipmentTag: 'PC-101',
      pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: HOURS_PER_YEAR,
      ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION,
      factor: pneumaticHighBleed,
    })

    expect(result.pollutant).toBe('CH4')
    expect(result.calculatedQuantity).toBeCloseTo(3002.23, 1)
    expect(result.quantityMetricTons).toBeCloseTo(3.00223, 4)
    expect(result.co2Equivalent).toBeCloseTo(84.062, 2)
    expect(result.calculationMethod).toBe('SUBPART_W_EQ_W1B_POPULATION_FACTOR')
    expect(result.activityData.scfWholeGas).toBeCloseTo(183960, 0)
    expect(result.activityData.scfCh4).toBeCloseTo(156366, 0)
  })

  test('REGRESSION GUARD: high-bleed full year is not the pre-2026-07 fabricated ~0.822 mt', () => {
    const result = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: HOURS_PER_YEAR, ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION, factor: pneumaticHighBleed,
    })
    expect(result.co2Equivalent).toBeGreaterThan(50)
  })

  test('high-bleed emits the Table W-1 ratio (21/6.8 ≈ 3.09×) more than low-bleed', () => {
    const high = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: HOURS_PER_YEAR, ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION, factor: pneumaticHighBleed,
    })
    const low = calculatePneumatic({
      equipmentId: 'eq-2', equipmentTag: 'PC-102', pneumaticType: 'CONTINUOUS_LOW_BLEED',
      hoursOperated: HOURS_PER_YEAR, ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION, factor: pneumaticLowBleed,
    })

    // 21 / 6.8 = 3.0882 -- hours and CH4 fraction cancel, ratio is factor-only
    expect(high.co2Equivalent / low.co2Equivalent).toBeCloseTo(3.088, 2)
  })

  test('partial-period emissions scale linearly with hours', () => {
    const fullYear = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: HOURS_PER_YEAR, ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION, factor: pneumaticHighBleed,
    })
    const halfYear = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'CONTINUOUS_HIGH_BLEED',
      hoursOperated: HOURS_PER_YEAR / 2, ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION, factor: pneumaticHighBleed,
    })

    expect(halfYear.co2Equivalent).toBeCloseTo(fullYear.co2Equivalent / 2, 3)
  })

  test('rejects wrong factor unit', () => {
    expect(() =>
      calculatePneumatic({
        equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'CONTINUOUS_HIGH_BLEED',
        hoursOperated: 100,
        ch4MoleFraction: DEFAULT_TEST_CH4_FRACTION,
        factor: { ...pneumaticHighBleed, factorUnit: 'lb-VOC/bbl' },
      }),
    ).toThrow(/scf-whole-gas\/hr/)
  })
})

// ============================================================
// STORAGE TANK
// ============================================================

describe('calculateStorageTank', () => {
  test('full-year throughput of 4800 bbl on standard factor', () => {
    // 4800 bbl × 1.86 lb VOC/bbl = 8928 lb VOC
    // 8928 / 2.20462 = 4049.8 kg VOC ≈ 4.05 mt VOC
    const result = calculateStorageTank({
      equipmentId: 'eq-3',
      equipmentTag: 'ST-101',
      throughputBbl: 4800,
      factor: tankVoc,
    })

    expect(result.pollutant).toBe('VOC')
    expect(result.calculatedQuantity).toBeCloseTo(4049.8, 0)
    expect(result.quantityMetricTons).toBeCloseTo(4.05, 2)
    expect(result.co2Equivalent).toBe(0)  // VOC not GHG-weighted
  })

  test('tank below 6 tpy VOC potential — informational only', () => {
    // 3000 bbl × 1.86 lb/bbl = 5580 lb = 2.53 mt VOC = below OOOOb threshold
    const result = calculateStorageTank({
      equipmentId: 'eq-3', equipmentTag: 'ST-101',
      throughputBbl: 3000, factor: tankVoc,
    })
    expect(result.quantityMetricTons).toBeLessThan(6 * 0.907)
  })
})

// ============================================================
// COMPRESSOR
// ============================================================

// ============================================================
// FUGITIVE COMPONENTS
// ============================================================

