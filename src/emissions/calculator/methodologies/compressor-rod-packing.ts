/**
 * Reciprocating compressor rod packing venting — Equation W-29E.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(p)(10)(iii)–(iv),
 * Equations W-29D (facility summation) and W-29E (per compressor).
 * VERIFIED against live eCFR text 2026-08-17.
 *
 *   Es,i,p = EFs,p × (Tp / Ttotal) × (GHGi,p / GHGEF)
 *
 *   EFs,p   = 2.13e5 scf/yr (CH4) or 1.18e4 scf/yr (CO2) per compressor
 *   Tp      = hours in OPERATING MODE in the reporting year
 *   Ttotal  = 8760 (8784 in leap years)
 *   GHGi,p  = facility gas mole fraction of the GHG, per §98.233(u)(2)
 *   GHGEF   = reference mole fraction the factor was derived at:
 *             0.98 for CH4, 0.02 for CO2
 *
 * THIS IS NOT THE W-1B CHAIN. Three differences that matter:
 *   1. EF is already GHG-specific and ANNUAL — not whole gas, not per hour.
 *   2. Composition is a NORMALIZATION RATIO (actual / reference), not a
 *      simple multiplication. Multiplying by mole fraction alone would
 *      understate CH4 by ~13% at typical compositions.
 *   3. Tp counts OPERATING MODE ONLY. A compressor in standby-pressurized
 *      or not-operating-depressurized contributes zero on this path.
 *
 * APPLICABILITY (§98.233(p)(10)): this factor path applies ONLY to
 * compressors that are (a) NOT subject to the OOOOb reciprocating
 * compressor standards in §60.5385b (or an approved state/Federal plan),
 * AND (b) for which the operator has not elected to measure. Compressors
 * subject to §60.5385b MUST be measured — no factor substitute exists.
 * The orchestrator must not dispatch here for those; see
 * Equipment.isSubjectToOOOObCompressorStandards.
 *
 * SCOPE (§98.233(p)(10)(iii)–(iv)): rod packing emissions routed to a
 * flare, combustion, or vapor recovery system are NOT required to be
 * determined under paragraph (p). Only compressors venting directly to
 * atmosphere are counted.
 *
 * Retires the pre-2026-08 per-cylinder calc (ef-seed-3, 0.00228
 * scf-CH4/hr/cylinder, citing the nonexistent "Table W-7" basis for rod
 * packing — Table W-7 is internal combustion methane slip). That factor
 * understated a full-year compressor by roughly 4,650x.
 */
import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

/** Reference mole fractions used in deriving EFs,p (§98.233(p)(10)(iv)). */
export const W29E_REFERENCE_MOLE_FRACTION = { CH4: 0.98, CO2: 0.02 } as const

/** Unit string every W-29E compressor factor row must carry. */
export const COMPRESSOR_FACTOR_UNIT = 'scf-GHG/yr/compressor'

export interface CompressorRodPackingInput {
  equipmentId: string
  equipmentTag: string
  /**
   * Hours the compressor was in OPERATING MODE during the reporting year
   * (§98.238 "compressor mode"). NOT total hours on site — standby-
   * pressurized and not-operating-depressurized time is excluded here.
   */
  operatingHours: number
  /** Total hours in the reporting year: 8760, or 8784 in a leap year. */
  totalHoursInYear: number
  /** Facility CH4 mole fraction, 0–1 (§98.233(u)(2)). */
  ch4MoleFraction: number
  /** Facility CO2 mole fraction, 0–1. Omit/0 to skip the CO2 leg. */
  co2MoleFraction?: number
  /** True when composition came from the platform default. */
  isCompositionAssumed?: boolean
  /** CH4 factor row from DB. factorValue is scf CH4/yr/compressor. */
  ch4Factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
  /** CO2 factor row from DB. factorValue is scf CO2/yr/compressor. */
  co2Factor?: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculateCompressorRodPacking(
  input: CompressorRodPackingInput,
): MethodologyResult {
  const {
    equipmentId,
    equipmentTag,
    operatingHours,
    totalHoursInYear,
    ch4MoleFraction,
    co2MoleFraction = 0,
    isCompositionAssumed = false,
    ch4Factor,
    co2Factor,
  } = input

  if (ch4Factor.factorUnit !== COMPRESSOR_FACTOR_UNIT) {
    // Hard-fails on the legacy 'scf-CH4/hr/cylinder' row (ef-seed-3) so the
    // fabricated per-cylinder factor can never silently produce a number.
    throw new Error(
      `calculateCompressorRodPacking expects factor in ${COMPRESSOR_FACTOR_UNIT}, ` +
        `got: ${ch4Factor.factorUnit}. If this is 'scf-CH4/hr/cylinder', the ` +
        `fabricated pre-2026-08 rod packing factor (ef-seed-3) is still active ` +
        `— run the W-29E compressor factor correction.`,
    )
  }
  if (!(ch4MoleFraction > 0 && ch4MoleFraction <= 1)) {
    throw new Error(`ch4MoleFraction must be in (0, 1], got: ${ch4MoleFraction}`)
  }
  if (co2MoleFraction < 0 || co2MoleFraction > 1) {
    throw new Error(`co2MoleFraction must be in [0, 1], got: ${co2MoleFraction}`)
  }
  if (!(totalHoursInYear === 8760 || totalHoursInYear === 8784)) {
    throw new Error(
      `totalHoursInYear must be 8760 or 8784 (leap), got: ${totalHoursInYear}`,
    )
  }
  if (operatingHours < 0 || operatingHours > totalHoursInYear) {
    throw new Error(
      `operatingHours must be between 0 and ${totalHoursInYear}, got: ${operatingHours}`,
    )
  }

  // Eq. W-29E: EF × (Tp / Ttotal) × (GHGi,p / GHGEF)
  const timeFraction = operatingHours / totalHoursInYear

  const scfCh4 =
    ch4Factor.factorValue *
    timeFraction *
    (ch4MoleFraction / W29E_REFERENCE_MOLE_FRACTION.CH4)

  const scfCo2 =
    co2Factor && co2MoleFraction > 0
      ? co2Factor.factorValue *
        timeFraction *
        (co2MoleFraction / W29E_REFERENCE_MOLE_FRACTION.CO2)
      : 0

  const kgCh4 = scfToKg(scfCh4, 'CH4')
  const kgCo2 = scfCo2 > 0 ? scfToKg(scfCo2, 'CO2') : 0
  const mtCh4 = kgToMetricTons(kgCh4)
  const mtCo2 = kgToMetricTons(kgCo2)

  const co2Equivalent =
    toCo2Equivalent(mtCh4, 'CH4') + (mtCo2 > 0 ? toCo2Equivalent(mtCo2, 'CO2') : 0)

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'COMPRESSOR_RECIPROCATING',
    pollutant: 'CH4',
    calculatedQuantity: kgCh4,
    unit: 'kg',
    quantityMetricTons: mtCh4,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_EQ_W29E_ROD_PACKING',
    emissionFactorId: ch4Factor.id,
    activityData: {
      operatingHours,
      totalHoursInYear,
      timeFraction,
      ch4FactorValue: ch4Factor.factorValue,
      ch4FactorUnit: ch4Factor.factorUnit,
      co2FactorValue: co2Factor?.factorValue ?? null,
      ch4MoleFraction,
      co2MoleFraction,
      referenceMoleFractionCh4: W29E_REFERENCE_MOLE_FRACTION.CH4,
      referenceMoleFractionCo2: W29E_REFERENCE_MOLE_FRACTION.CO2,
      assumedComposition: isCompositionAssumed,
      scfCh4,
      scfCo2,
      mtCh4,
      mtCo2,
      ventedToAtmosphere: true,
    },
    notes:
      `Rod packing vent, ${operatingHours.toFixed(0)} of ${totalHoursInYear} hours in ` +
      `operating mode. CH4 ${ch4Factor.factorValue.toExponential(2)} scf/yr normalized ` +
      `from reference ${W29E_REFERENCE_MOLE_FRACTION.CH4} to facility ${ch4MoleFraction}` +
      `${isCompositionAssumed ? ' (platform default — provide facility gas analysis)' : ''}. ` +
      `Eq. W-29E per §98.233(p)(10)(iv). Applies only to compressors not subject to ` +
      `§60.5385b measurement requirements and venting directly to atmosphere.`,
  }
}
