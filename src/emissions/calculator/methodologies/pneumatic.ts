/**
 * Pneumatic controller emission calculation.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(a),
 * Equation W-1B (population emission factor method) using default
 * whole-gas factors from Table W-1 to Subpart W (89 FR 42323,
 * May 14 2024, effective Jan 1 2025).
 *
 * Factor selection (Table W-1, onshore production / gathering & boosting):
 *   - CONTINUOUS_LOW_BLEED:  6.8  scf whole gas/hr/device
 *   - CONTINUOUS_HIGH_BLEED: 21   scf whole gas/hr/device
 *   - INTERMITTENT_BLEED:    8.8  scf whole gas/hr/device
 *
 * IMPORTANT — these are WHOLE GAS factors, not CH4-specific factors.
 * Equation W-1B: Es,CH4 = Count × EF × T × X_CH4
 * where X_CH4 is the CH4 mole fraction of the facility's produced gas
 * (§98.233(u)(2)). The mole fraction multiplication happens HERE, in
 * this function — the factor row must never be pre-multiplied.
 *
 * Multiple controllers per facility are summed by the orchestrator.
 */
import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

export type PneumaticDeviceType =
  | 'CONTINUOUS_HIGH_BLEED'
  | 'INTERMITTENT_BLEED'
  | 'CONTINUOUS_LOW_BLEED'

/** Unit string every Table W-1 pneumatic factor row must carry. */
export const WHOLE_GAS_FACTOR_UNIT = 'scf-whole-gas/hr'

export interface PneumaticInput {
  equipmentId: string
  equipmentTag: string
  pneumaticType: PneumaticDeviceType | null
  hoursOperated: number
  /**
   * CH4 mole fraction of the facility's produced natural gas, 0–1.
   * Sourced from Facility.ch4MoleFraction; §98.233(u)(2) requires
   * facility-specific composition.
   */
  ch4MoleFraction: number
  /**
   * True when ch4MoleFraction came from the platform default rather
   * than a facility gas analysis. Recorded in activityData so the
   * provenance chain shows the assumption.
   */
  isCompositionAssumed?: boolean
  /**
   * Number of devices this calculation represents. Defaults to 1 for a
   * single equipment row. EPA field: TotalNaturalGasDevices.
   */
  deviceCount?: number
  /**
   * Whether the device count was estimated rather than directly counted.
   * EPA field: IsCountsEstimated. Defaults to false (actual count).
   */
  isCountEstimated?: boolean
  /** The factor row pulled from DB. value is scf whole gas/hr. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculatePneumatic(input: PneumaticInput): MethodologyResult {
  const {
    equipmentId,
    equipmentTag,
    pneumaticType,
    hoursOperated,
    ch4MoleFraction,
    isCompositionAssumed = false,
    deviceCount = 1,
    isCountEstimated = false,
    factor,
  } = input

  if (factor.factorUnit !== WHOLE_GAS_FACTOR_UNIT) {
    // Deliberately hard-fails on the legacy 'scf-CH4/hr' rows so a stale
    // factor table can never silently produce a wrong compliance number.
    throw new Error(
      `calculatePneumatic expects factor in ${WHOLE_GAS_FACTOR_UNIT}, got: ` +
        `${factor.factorUnit}. If this is 'scf-CH4/hr', the fabricated ` +
        `pre-2026-07 factor rows are still active — run the Table W-1 ` +
        `factor correction (expire ef-seed-0/ef-seed-1, seed ef-w1-* rows).`,
    )
  }
  if (!(ch4MoleFraction > 0 && ch4MoleFraction <= 1)) {
    throw new Error(
      `ch4MoleFraction must be in (0, 1], got: ${ch4MoleFraction}`,
    )
  }

  // Equation W-1B chain: whole gas → CH4 volume → mass → CO2e
  const scfWholeGas = factor.factorValue * hoursOperated * deviceCount
  const scfCh4 = scfWholeGas * ch4MoleFraction
  const kgEmitted = scfToKg(scfCh4, 'CH4')
  const metricTons = kgToMetricTons(kgEmitted)
  const co2Equivalent = toCo2Equivalent(metricTons, 'CH4')

  const deviceTypeLabel = pneumaticType ?? 'UNSPECIFIED'

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'PNEUMATIC_CONTROLLER',
    pollutant: 'CH4',
    calculatedQuantity: kgEmitted,
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_EQ_W1B_POPULATION_FACTOR',
    emissionFactorId: factor.id,
    activityData: {
      // Field names map to EPA's Subpart W XML schema for the export.
      pneumaticType: deviceTypeLabel,
      deviceCount,
      isCountEstimated,
      ventedToAtmosphereCount: deviceCount,
      hoursOperated,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      ch4MoleFraction,
      assumedComposition: isCompositionAssumed,
      scfWholeGas,
      scfCh4,
    },
    notes:
      `${deviceCount} ${deviceTypeLabel.toLowerCase().replace(/_/g, ' ')} controller(s), ` +
      `${hoursOperated.toFixed(0)} hours, count ${isCountEstimated ? 'estimated' : 'actual'}, ` +
      `CH4 fraction ${ch4MoleFraction}${isCompositionAssumed ? ' (platform default — provide facility gas analysis)' : ''}, ` +
      `factor from ${factor.source} (Table W-1).`,
  }
}
