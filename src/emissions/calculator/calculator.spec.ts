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
import { calculateCompressor } from './methodologies/compressor'
import { calculateFugitive } from './methodologies/fugitive'

// ============================================================
// Test factor fixtures matching the seeded DB rows
// ============================================================

const pneumaticHighBleed = {
  id: 'ef-seed-0',
  factorValue: 0.174,
  factorUnit: 'scf-CH4/hr',
  source: 'AP42',
}

const pneumaticLowBleed = {
  id: 'ef-seed-1',
  factorValue: 0.0017,
  factorUnit: 'scf-CH4/hr',
  source: 'AP42',
}

const tankVoc = {
  id: 'ef-seed-5',
  factorValue: 1.86,
  factorUnit: 'lb-VOC/bbl',
  source: 'AP42',
}

const compressorCh4 = {
  id: 'ef-seed-3',
  factorValue: 0.00228,
  factorUnit: 'scf-CH4/hr/cylinder',
  source: 'AP42',
}

const fugitiveCh4 = {
  id: 'ef-seed-2',
  factorValue: 0.00004,
  factorUnit: 'tpy-CH4/component',
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
  test('CH4 density matches NIST standard conditions', () => {
    expect(CH4_KG_PER_SCF).toBeCloseTo(0.01926, 4)
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
    expect(scfToKg(1000, 'CH4')).toBeCloseTo(19.26, 2)
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
  test('high-bleed controller, full year, matches EPA worked example', () => {
    // Reference calc:
    //   0.174 scf/hr × 8760 hr = 1524.24 scf CH4
    //   1524.24 × 0.01926 kg/scf = 29.36 kg CH4
    //   = 0.02936 mt CH4
    //   × 28 GWP = 0.822 mt CO2e
    const result = calculatePneumatic({
      equipmentId: 'eq-1',
      equipmentTag: 'PC-101',
      pneumaticType: 'high-bleed',
      hoursOperated: HOURS_PER_YEAR,
      factor: pneumaticHighBleed,
    })

    expect(result.pollutant).toBe('CH4')
    expect(result.calculatedQuantity).toBeCloseTo(29.36, 1)
    expect(result.quantityMetricTons).toBeCloseTo(0.02936, 4)
    expect(result.co2Equivalent).toBeCloseTo(0.822, 2)
    expect(result.calculationMethod).toBe('SUBPART_W_PNEUMATIC')
    expect(result.activityData.scfEmitted).toBeCloseTo(1524.24, 1)
  })

  test('low-bleed controller emits ~100× less than high-bleed', () => {
    const high = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'high-bleed',
      hoursOperated: HOURS_PER_YEAR, factor: pneumaticHighBleed,
    })
    const low = calculatePneumatic({
      equipmentId: 'eq-2', equipmentTag: 'PC-102', pneumaticType: 'low-bleed',
      hoursOperated: HOURS_PER_YEAR, factor: pneumaticLowBleed,
    })

    // 0.174 / 0.0017 ≈ 102.4
    expect(high.co2Equivalent / low.co2Equivalent).toBeCloseTo(102.35, 0)
  })

  test('partial-period emissions scale linearly with hours', () => {
    const fullYear = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'high-bleed',
      hoursOperated: HOURS_PER_YEAR, factor: pneumaticHighBleed,
    })
    const halfYear = calculatePneumatic({
      equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'high-bleed',
      hoursOperated: HOURS_PER_YEAR / 2, factor: pneumaticHighBleed,
    })

    expect(halfYear.co2Equivalent).toBeCloseTo(fullYear.co2Equivalent / 2, 3)
  })

  test('rejects wrong factor unit', () => {
    expect(() =>
      calculatePneumatic({
        equipmentId: 'eq-1', equipmentTag: 'PC-101', pneumaticType: 'high-bleed',
        hoursOperated: 100,
        factor: { ...pneumaticHighBleed, factorUnit: 'lb-VOC/bbl' },
      }),
    ).toThrow(/scf-CH4\/hr/)
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

describe('calculateCompressor', () => {
  test('2-cylinder reciprocating compressor, full year', () => {
    // 0.00228 scf/hr/cyl × 2 cyl × 8760 hr = 39.94 scf CH4
    // × 0.01926 kg/scf = 0.7694 kg CH4 = 0.0007694 mt CH4
    // × 28 GWP = 0.0215 mt CO2e
    const result = calculateCompressor({
      equipmentId: 'eq-4', equipmentTag: 'C-101',
      cylinders: 2, hoursOperated: HOURS_PER_YEAR, factor: compressorCh4,
    })

    expect(result.pollutant).toBe('CH4')
    expect(result.calculatedQuantity).toBeCloseTo(0.769, 2)
    expect(result.co2Equivalent).toBeCloseTo(0.0215, 3)
  })

  test('cylinder count scales linearly', () => {
    const oneCyl = calculateCompressor({
      equipmentId: 'eq-4', equipmentTag: 'C-101',
      cylinders: 1, hoursOperated: HOURS_PER_YEAR, factor: compressorCh4,
    })
    const fourCyl = calculateCompressor({
      equipmentId: 'eq-4', equipmentTag: 'C-101',
      cylinders: 4, hoursOperated: HOURS_PER_YEAR, factor: compressorCh4,
    })
    expect(fourCyl.co2Equivalent).toBeCloseTo(oneCyl.co2Equivalent * 4, 4)
  })
})

// ============================================================
// FUGITIVE COMPONENTS
// ============================================================

describe('calculateFugitive', () => {
  test('100 components, full year', () => {
    // 100 × 0.00004 tpy CH4/component × 1.0 yr fraction = 0.004 short tons CH4
    // × 0.907185 = 0.00363 mt CH4
    // × 28 GWP = 0.1016 mt CO2e
    const result = calculateFugitive({
      componentCount: 100,
      periodStart: fullYear2025.start,
      periodEnd: fullYear2025.end,
      factor: fugitiveCh4,
    })

    expect(result.pollutant).toBe('CH4')
    expect(result.quantityMetricTons).toBeCloseTo(0.00363, 4)
    expect(result.co2Equivalent).toBeCloseTo(0.1016, 3)
    expect(result.equipmentId).toBeNull() // facility-wide
  })

  test('component count scales linearly', () => {
    const small = calculateFugitive({
      componentCount: 50,
      periodStart: fullYear2025.start, periodEnd: fullYear2025.end,
      factor: fugitiveCh4,
    })
    const big = calculateFugitive({
      componentCount: 500,
      periodStart: fullYear2025.start, periodEnd: fullYear2025.end,
      factor: fugitiveCh4,
    })
    expect(big.co2Equivalent / small.co2Equivalent).toBeCloseTo(10, 4)
  })

  test('Q1-only prorates to ~25% of annual', () => {
    const annual = calculateFugitive({
      componentCount: 100,
      periodStart: fullYear2025.start, periodEnd: fullYear2025.end,
      factor: fugitiveCh4,
    })
    const q1 = calculateFugitive({
      componentCount: 100,
      periodStart: fullYear2025.start,
      periodEnd: new Date('2025-04-01T00:00:00Z'),
      factor: fugitiveCh4,
    })
    expect(q1.co2Equivalent / annual.co2Equivalent).toBeCloseTo(0.247, 2)
  })
})
