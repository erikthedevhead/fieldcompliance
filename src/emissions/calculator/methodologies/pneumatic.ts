/**
 * Pneumatic controller emission calculation.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(a), Table W-2.
 * EPA-approved approach: per-controller emission factor × hours operated.
 *
 * Factor selection:
 *   - high-bleed: 0.174 scf CH4/hr (Subpart W Table W-2)
 *   - low-bleed:  0.0017 scf CH4/hr
 *   - instrument: treated as low-bleed for v1 (sub-6-scf/hr per OOOOb §60.5395b)
 *
 * Multiple controllers per facility are summed by the orchestrator.
 */

import { scfToKg, kgToMetricTons, toCo2Equivalent, hoursBetween, HOURS_PER_YEAR } from '../units'
import { MethodologyResult } from '../types'

export interface PneumaticInput {
  equipmentId: string
  equipmentTag: string
  /** "high-bleed" | "low-bleed" | "instrument" */
  pneumaticType: string | null
  hoursOperated: number
  /** The factor row pulled from DB. value is scf-CH4/hr. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculatePneumatic(input: PneumaticInput): MethodologyResult {
  const { equipmentId, equipmentTag, pneumaticType, hoursOperated, factor } = input

  if (factor.factorUnit !== 'scf-CH4/hr') {
    throw new Error(
      `calculatePneumatic expects factor in scf-CH4/hr, got: ${factor.factorUnit}`,
    )
  }

  const scfEmitted = factor.factorValue * hoursOperated
  const kgEmitted = scfToKg(scfEmitted, 'CH4')
  const metricTons = kgToMetricTons(kgEmitted)
  const co2Equivalent = toCo2Equivalent(metricTons, 'CH4')

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'PNEUMATIC_CONTROLLER',
    pollutant: 'CH4',
    calculatedQuantity: kgEmitted,
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_PNEUMATIC',
    emissionFactorId: factor.id,
    activityData: {
      pneumaticType: pneumaticType ?? 'unspecified',
      hoursOperated,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      scfEmitted,
    },
    notes: `${pneumaticType ?? 'unspecified'} controller, ${hoursOperated.toFixed(0)} hours, ` +
           `factor from ${factor.source}.`,
  }
}
