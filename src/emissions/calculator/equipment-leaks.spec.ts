/**
 * Unit tests for the equipment-leak methodology (§98.233(r),
 * Table W-1 major-equipment population method, 89 FR 42323).
 *
 * Expected values hand-computed and machine-verified:
 *   scfWholeGas = EF × hours; scfCH4 = × 0.85; kg = × 0.0192; CO2e = × 28
 */
import { calculateEquipmentLeak } from './methodologies/equipment-leaks'
import { HOURS_PER_YEAR } from './units'

const CH4 = 0.85

const mkFactor = (id: string, factorValue: number) => ({
  id,
  factorValue,
  factorUnit: 'scf-whole-gas/hr',
  source: 'SUBPART_W',
})

const base = {
  equipmentId: 'eq-1',
  equipmentTag: 'WH-101',
  serviceType: 'GAS' as const,
  hoursOperated: HOURS_PER_YEAR,
  ch4MoleFraction: CH4,
}

describe('calculateEquipmentLeak', () => {
  test('wellhead, gas service, full year matches Table W-1 worked example', () => {
    // 8.87 × 8760 = 77,701.2 scf whole gas; × 0.85 = 66,046.02 scf CH4
    // × 0.0192 = 1268.0836 kg = 1.268084 mt; × 28 = 35.5063 mt CO2e
    const r = calculateEquipmentLeak({
      ...base,
      majorEquipmentType: 'WELLHEAD',
      factor: mkFactor('ef-w1-leak-wellhead-gas', 8.87),
    })
    expect(r.pollutant).toBe('CH4')
    expect(r.activityData.scfWholeGas).toBeCloseTo(77701.2, 1)
    expect(r.activityData.scfCh4).toBeCloseTo(66046.02, 1)
    expect(r.calculatedQuantity).toBeCloseTo(1268.08, 1)
    expect(r.quantityMetricTons).toBeCloseTo(1.26808, 4)
    expect(r.co2Equivalent).toBeCloseTo(35.506, 2)
    expect(r.calculationMethod).toBe('SUBPART_W_LEAK_MAJOR_EQUIPMENT_POPULATION')
  })

  test('separator, gas service, full year', () => {
    // 9.65 × 8760 × 0.85 × 0.0192 / 1000 × 28 = 38.6287 mt CO2e
    const r = calculateEquipmentLeak({
      ...base,
      equipmentTag: 'SEP-101',
      majorEquipmentType: 'SEPARATOR',
      factor: mkFactor('ef-w1-leak-separator-gas', 9.65),
    })
    expect(r.co2Equivalent).toBeCloseTo(38.629, 2)
  })

  test('storage vessel, gas service, full year', () => {
    // 1.83 × 8760 × 0.85 × 0.0192 / 1000 × 28 = 7.3254 mt CO2e
    const r = calculateEquipmentLeak({
      ...base,
      equipmentTag: 'ST-101',
      majorEquipmentType: 'STORAGE_VESSEL',
      factor: mkFactor('ef-w1-leak-storage-vessel-gas', 1.83),
    })
    expect(r.co2Equivalent).toBeCloseTo(7.325, 2)
  })

  test('compressor leak record, full year (separate from rod-packing venting)', () => {
    // 13.8 × 8760 × 0.85 × 0.0192 / 1000 × 28 = 55.2410 mt CO2e
    const r = calculateEquipmentLeak({
      ...base,
      equipmentTag: 'C-101',
      majorEquipmentType: 'COMPRESSOR',
      factor: mkFactor('ef-w1-leak-compressor-gas', 13.8),
    })
    expect(r.co2Equivalent).toBeCloseTo(55.241, 2)
  })

  test('crude service uses the crude-block factor (wellhead 4.13 vs gas 8.87)', () => {
    // 4.13 × 8760 × 0.85 × 0.0192 / 1000 × 28 = 16.5323 mt CO2e
    const r = calculateEquipmentLeak({
      ...base,
      serviceType: 'CRUDE',
      majorEquipmentType: 'WELLHEAD',
      factor: mkFactor('ef-w1-leak-wellhead-crude', 4.13),
    })
    expect(r.co2Equivalent).toBeCloseTo(16.532, 2)
    expect(r.activityData.serviceType).toBe('CRUDE')
  })

  test('scales linearly with hours', () => {
    const full = calculateEquipmentLeak({
      ...base,
      majorEquipmentType: 'WELLHEAD',
      factor: mkFactor('ef-w1-leak-wellhead-gas', 8.87),
    })
    const half = calculateEquipmentLeak({
      ...base,
      hoursOperated: HOURS_PER_YEAR / 2,
      majorEquipmentType: 'WELLHEAD',
      factor: mkFactor('ef-w1-leak-wellhead-gas', 8.87),
    })
    expect(half.co2Equivalent * 2).toBeCloseTo(full.co2Equivalent, 6)
  })

  test('REGRESSION GUARD: rejects the retired per-component tpy factor unit', () => {
    expect(() =>
      calculateEquipmentLeak({
        ...base,
        majorEquipmentType: 'WELLHEAD',
        factor: {
          id: 'ef-seed-2',
          factorValue: 0.00004,
          factorUnit: 'tpy-CH4/component',
          source: 'AP42',
        },
      }),
    ).toThrow(/scf-whole-gas\/hr/)
  })

  test('records serviceType and composition assumption flags for provenance', () => {
    const r = calculateEquipmentLeak({
      ...base,
      majorEquipmentType: 'SEPARATOR',
      isServiceTypeAssumed: true,
      isCompositionAssumed: true,
      factor: mkFactor('ef-w1-leak-separator-gas', 9.65),
    })
    expect(r.activityData.assumedServiceType).toBe(true)
    expect(r.activityData.assumedComposition).toBe(true)
  })

  test('rejects invalid mole fraction', () => {
    expect(() =>
      calculateEquipmentLeak({
        ...base,
        ch4MoleFraction: 1.5,
        majorEquipmentType: 'WELLHEAD',
        factor: mkFactor('ef-w1-leak-wellhead-gas', 8.87),
      }),
    ).toThrow(/ch4MoleFraction/)
  })
})
