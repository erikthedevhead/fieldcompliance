/**
 * Unit tests for atmospheric storage tank Calculation Method 3
 * (§98.233(j)(3), Equations W-15A and W-15B). Values machine-verified.
 */
import {
  calculateTankHydrocarbonMethod3,
  calculateTankProducedWaterMethod3,
  producedWaterTier,
  METHOD_3_MAX_BBL_PER_DAY,
} from './methodologies/storage-tank-method3'

const crudeCh4 = { id: 'ef-w15a-crude-ch4', factorValue: 4.2, factorUnit: 'Mscf-GHG/yr/unit', source: 'SUBPART_W' }
const crudeCo2 = { id: 'ef-w15a-crude-co2', factorValue: 2.8, factorUnit: 'Mscf-GHG/yr/unit', source: 'SUBPART_W' }
const condCh4 = { id: 'ef-w15a-condensate-ch4', factorValue: 17.6, factorUnit: 'Mscf-GHG/yr/unit', source: 'SUBPART_W' }
const condCo2 = { id: 'ef-w15a-condensate-co2', factorValue: 2.8, factorUnit: 'Mscf-GHG/yr/unit', source: 'SUBPART_W' }

const waterLow = { id: 'ef-w15b-water-le-50psi', factorValue: 0.0015, factorUnit: 'mt-CH4/Mbbl', source: 'SUBPART_W' }
const waterMid = { id: 'ef-w15b-water-50-250psi', factorValue: 0.0142, factorUnit: 'mt-CH4/Mbbl', source: 'SUBPART_W' }
const waterHigh = { id: 'ef-w15b-water-gt-250psi', factorValue: 0.0508, factorUnit: 'mt-CH4/Mbbl', source: 'SUBPART_W' }

describe('W-15A hydrocarbon liquids (Method 3)', () => {
  test('crude oil, one feeding separator under 10 bbl/day', () => {
    // CH4 4.2 Mscf = 4200 scf × 0.0192 = 80.64 kg = 0.08064 mt × 28 = 2.25792
    // CO2 2.8 Mscf = 2800 scf × 0.0526 = 147.28 kg = 0.14728 mt × 1 = 0.14728
    const r = calculateTankHydrocarbonMethod3({
      equipmentId: 'eq-s1', equipmentTag: 'SEP-201', liquidType: 'CRUDE_OIL',
      dailyThroughputBbl: 6, ch4Factor: crudeCh4, co2Factor: crudeCo2,
    })
    expect(r.activityData.scfCh4).toBe(4200)
    expect(r.activityData.scfCo2).toBe(2800)
    expect(r.quantityMetricTons).toBeCloseTo(0.08064, 6)
    expect(r.co2Equivalent).toBeCloseTo(2.4052, 4)
    expect(r.calculationMethod).toBe('SUBPART_W_EQ_W15A_TANK_METHOD_3')
  })

  test('gas condensate emits ~4x the crude CH4 (17.6 vs 4.2)', () => {
    const r = calculateTankHydrocarbonMethod3({
      equipmentId: 'eq-s2', equipmentTag: 'SEP-202', liquidType: 'GAS_CONDENSATE',
      dailyThroughputBbl: 2, ch4Factor: condCh4, co2Factor: condCo2,
    })
    expect(r.activityData.scfCh4).toBe(17600)
    expect(r.co2Equivalent).toBeCloseTo(9.60904, 4)
  })

  test('CO2 factor is identical for both liquid types', () => {
    expect(crudeCo2.factorValue).toBe(condCo2.factorValue)
  })

  test('emissions are per feeding unit, independent of throughput within the band', () => {
    const low = calculateTankHydrocarbonMethod3({
      equipmentId: 'a', equipmentTag: 'A', liquidType: 'CRUDE_OIL',
      dailyThroughputBbl: 0.5, ch4Factor: crudeCh4, co2Factor: crudeCo2,
    })
    const high = calculateTankHydrocarbonMethod3({
      equipmentId: 'b', equipmentTag: 'B', liquidType: 'CRUDE_OIL',
      dailyThroughputBbl: 9.9, ch4Factor: crudeCh4, co2Factor: crudeCo2,
    })
    expect(low.co2Equivalent).toBeCloseTo(high.co2Equivalent, 10)
  })

  test('rejects throughput at or above the 10 bbl/day Method 3 ceiling', () => {
    expect(() =>
      calculateTankHydrocarbonMethod3({
        equipmentId: 'x', equipmentTag: 'X', liquidType: 'CRUDE_OIL',
        dailyThroughputBbl: METHOD_3_MAX_BBL_PER_DAY,
        ch4Factor: crudeCh4, co2Factor: crudeCo2,
      }),
    ).toThrow(/Method 1 or 2/)
  })

  test('rejects zero throughput', () => {
    expect(() =>
      calculateTankHydrocarbonMethod3({
        equipmentId: 'x', equipmentTag: 'X', liquidType: 'CRUDE_OIL',
        dailyThroughputBbl: 0, ch4Factor: crudeCh4,
      }),
    ).toThrow(/> 0/)
  })

  test('REGRESSION GUARD: rejects the retired lb-VOC/bbl factor', () => {
    expect(() =>
      calculateTankHydrocarbonMethod3({
        equipmentId: 'x', equipmentTag: 'X', liquidType: 'CRUDE_OIL',
        dailyThroughputBbl: 5,
        ch4Factor: { id: 'ef-seed-5', factorValue: 1.86, factorUnit: 'lb-VOC/bbl', source: 'AP42' },
      }),
    ).toThrow(/Mscf-GHG\/yr\/unit/)
  })
})

describe('W-15B produced water (Method 3)', () => {
  test('pressure tier boundaries follow §98.233(j)(3)', () => {
    expect(producedWaterTier(0)).toBe('PRODUCED_WATER_LE_50PSI')
    expect(producedWaterTier(50)).toBe('PRODUCED_WATER_LE_50PSI')
    expect(producedWaterTier(50.1)).toBe('PRODUCED_WATER_50_250PSI')
    expect(producedWaterTier(250)).toBe('PRODUCED_WATER_50_250PSI')
    expect(producedWaterTier(250.1)).toBe('PRODUCED_WATER_GT_250PSI')
  })

  test('5,000 bbl at low pressure tier', () => {
    // 0.0015 × 5000 × 0.001 = 0.0075 mt CH4 × 28 = 0.21
    const r = calculateTankProducedWaterMethod3({
      equipmentId: 'eq-w1', equipmentTag: 'SEP-301',
      producedWaterBbl: 5000, feedPressurePsig: 30, factor: waterLow,
    })
    expect(r.quantityMetricTons).toBeCloseTo(0.0075, 8)
    expect(r.co2Equivalent).toBeCloseTo(0.21, 6)
    expect(r.activityData.pressureTier).toBe('PRODUCED_WATER_LE_50PSI')
  })

  test('10,000 bbl at mid pressure tier', () => {
    const r = calculateTankProducedWaterMethod3({
      equipmentId: 'eq-w2', equipmentTag: 'SEP-302',
      producedWaterBbl: 10000, feedPressurePsig: 120, factor: waterMid,
    })
    expect(r.quantityMetricTons).toBeCloseTo(0.142, 6)
    expect(r.co2Equivalent).toBeCloseTo(3.976, 4)
  })

  test('25,000 bbl at high pressure tier', () => {
    const r = calculateTankProducedWaterMethod3({
      equipmentId: 'eq-w3', equipmentTag: 'SEP-303',
      producedWaterBbl: 25000, feedPressurePsig: 400, factor: waterHigh,
    })
    expect(r.quantityMetricTons).toBeCloseTo(1.27, 6)
    expect(r.co2Equivalent).toBeCloseTo(35.56, 4)
  })

  test('pressure tier drives a 33.9x swing at identical volume', () => {
    const mk = (f: typeof waterLow, psi: number) =>
      calculateTankProducedWaterMethod3({
        equipmentId: 'x', equipmentTag: 'X',
        producedWaterBbl: 10000, feedPressurePsig: psi, factor: f,
      }).co2Equivalent
    expect(mk(waterHigh, 400) / mk(waterLow, 20)).toBeCloseTo(33.867, 2)
  })

  test('scales linearly with volume', () => {
    const a = calculateTankProducedWaterMethod3({
      equipmentId: 'x', equipmentTag: 'X',
      producedWaterBbl: 1000, feedPressurePsig: 100, factor: waterMid,
    })
    const b = calculateTankProducedWaterMethod3({
      equipmentId: 'x', equipmentTag: 'X',
      producedWaterBbl: 4000, feedPressurePsig: 100, factor: waterMid,
    })
    expect(a.co2Equivalent * 4).toBeCloseTo(b.co2Equivalent, 8)
  })

  test('W-15B yields mass directly — no density conversion applied', () => {
    // 0.0142 mt/Mbbl × 1000 bbl × 0.001 = 0.0142 mt exactly.
    // If scfToKg had been applied this would be off by ~50x.
    const r = calculateTankProducedWaterMethod3({
      equipmentId: 'x', equipmentTag: 'X',
      producedWaterBbl: 1000, feedPressurePsig: 100, factor: waterMid,
    })
    expect(r.quantityMetricTons).toBeCloseTo(0.0142, 10)
  })

  test('rejects a volumetric factor unit', () => {
    expect(() =>
      calculateTankProducedWaterMethod3({
        equipmentId: 'x', equipmentTag: 'X',
        producedWaterBbl: 1000, feedPressurePsig: 100,
        factor: { id: 'wrong', factorValue: 4.2, factorUnit: 'Mscf-GHG/yr/unit', source: 'SUBPART_W' },
      }),
    ).toThrow(/mt-CH4\/Mbbl/)
  })
})
