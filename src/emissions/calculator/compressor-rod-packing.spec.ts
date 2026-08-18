/**
 * Unit tests for reciprocating compressor rod packing (Eq. W-29E,
 * §98.233(p)(10)(iv)). Expected values machine-verified.
 *
 * Reference chain: EF × (Tp/Ttotal) × (GHGi,p/GHGEF) → density → GWP
 */
import { calculateCompressorRodPacking } from './methodologies/compressor-rod-packing'

const CH4_FACTOR = {
  id: 'ef-w29e-recip-ch4',
  factorValue: 2.13e5,
  factorUnit: 'scf-GHG/yr/compressor',
  source: 'SUBPART_W',
}
const CO2_FACTOR = {
  id: 'ef-w29e-recip-co2',
  factorValue: 1.18e4,
  factorUnit: 'scf-GHG/yr/compressor',
  source: 'SUBPART_W',
}

const base = {
  equipmentId: 'eq-c1',
  equipmentTag: 'C-101',
  totalHoursInYear: 8760,
  ch4MoleFraction: 0.85,
  co2MoleFraction: 0.02,
  ch4Factor: CH4_FACTOR,
  co2Factor: CO2_FACTOR,
}

describe('calculateCompressorRodPacking (Eq. W-29E)', () => {
  test('full-year operating, 85% CH4 / 2% CO2', () => {
    // CH4: 213000 × 1 × (0.85/0.98) = 184,744.90 scf
    //      × 0.0192 = 3547.10 kg = 3.547102 mt; × 28 = 99.3189
    // CO2: 11800 × 1 × (0.02/0.02) = 11,800 scf
    //      × 0.0526 = 620.68 kg = 0.62068 mt; × 1 = 0.62068
    // total CO2e = 99.939537
    const r = calculateCompressorRodPacking({ ...base, operatingHours: 8760 })
    expect(r.activityData.scfCh4).toBeCloseTo(184744.9, 1)
    expect(r.activityData.scfCo2).toBeCloseTo(11800, 1)
    expect(r.quantityMetricTons).toBeCloseTo(3.547102, 5)
    expect(r.co2Equivalent).toBeCloseTo(99.939537, 4)
    expect(r.calculationMethod).toBe('SUBPART_W_EQ_W29E_ROD_PACKING')
  })

  test('half-year operating scales linearly', () => {
    const r = calculateCompressorRodPacking({ ...base, operatingHours: 4380 })
    expect(r.co2Equivalent).toBeCloseTo(49.969769, 4)
  })

  test('at the reference composition (0.98 CH4) the CH4 factor is unscaled', () => {
    const r = calculateCompressorRodPacking({
      ...base,
      operatingHours: 8760,
      ch4MoleFraction: 0.98,
    })
    expect(r.activityData.scfCh4).toBeCloseTo(213000, 1)
    expect(r.co2Equivalent).toBeCloseTo(115.12948, 4)
  })

  test('leap year uses 8784 hours', () => {
    const r = calculateCompressorRodPacking({
      ...base,
      totalHoursInYear: 8784,
      operatingHours: 8784,
    })
    expect(r.co2Equivalent).toBeCloseTo(99.939537, 4)
  })

  test('omitting CO2 composition skips the CO2 leg', () => {
    const r = calculateCompressorRodPacking({
      ...base,
      operatingHours: 8760,
      co2MoleFraction: 0,
    })
    expect(r.activityData.scfCo2).toBe(0)
    expect(r.co2Equivalent).toBeCloseTo(99.318857, 4)
  })

  test('zero operating hours produces zero emissions (standby-only compressor)', () => {
    const r = calculateCompressorRodPacking({ ...base, operatingHours: 0 })
    expect(r.co2Equivalent).toBe(0)
  })

  test('REGRESSION GUARD: full-year compressor is ~100 mt CO2e, never the fabricated ~0.02', () => {
    // ef-seed-3 (0.00228 scf-CH4/hr/cylinder × 2 cyl) produced 0.0215 mt.
    const r = calculateCompressorRodPacking({ ...base, operatingHours: 8760 })
    expect(r.co2Equivalent).toBeGreaterThan(50)
    expect(r.co2Equivalent).toBeLessThan(200)
  })

  test('rejects the retired per-cylinder factor unit', () => {
    expect(() =>
      calculateCompressorRodPacking({
        ...base,
        operatingHours: 8760,
        ch4Factor: {
          id: 'ef-seed-3',
          factorValue: 0.00228,
          factorUnit: 'scf-CH4/hr/cylinder',
          source: 'AP42',
        },
      }),
    ).toThrow(/scf-GHG\/yr\/compressor/)
  })

  test('rejects invalid hours and compositions', () => {
    expect(() =>
      calculateCompressorRodPacking({ ...base, operatingHours: 9000 }),
    ).toThrow(/operatingHours/)
    expect(() =>
      calculateCompressorRodPacking({
        ...base,
        operatingHours: 100,
        totalHoursInYear: 8000,
      }),
    ).toThrow(/8760 or 8784/)
    expect(() =>
      calculateCompressorRodPacking({
        ...base,
        operatingHours: 100,
        ch4MoleFraction: 1.5,
      }),
    ).toThrow(/ch4MoleFraction/)
  })

  test('records the normalization terms for provenance', () => {
    const r = calculateCompressorRodPacking({
      ...base,
      operatingHours: 8760,
      isCompositionAssumed: true,
    })
    expect(r.activityData.referenceMoleFractionCh4).toBe(0.98)
    expect(r.activityData.referenceMoleFractionCo2).toBe(0.02)
    expect(r.activityData.assumedComposition).toBe(true)
    expect(r.activityData.ventedToAtmosphere).toBe(true)
  })
})
