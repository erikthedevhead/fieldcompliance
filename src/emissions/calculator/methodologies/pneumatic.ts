/**
 * Pneumatic controller emission calculation.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(a), Table W-2.
 * EPA-approved approach: per-controller emission factor × hours operated,
 * using the default emission factor path — 98.233(a)(3)(i)(B). This is
 * distinct from the measured-factor path, 98.233(a)(3)(i)(A), which
 * requires a direct measurement program and is not modeled here.
 *
 * Factor selection (Subpart W Table W-2 default factors):
 *   - CONTINUOUS_HIGH_BLEED: 0.174 scf CH4/hr
 *   - CONTINUOUS_LOW_BLEED:  0.0017 scf CH4/hr
 *   - INTERMITTENT_BLEED:    ⚠ VALUE NOT YET SOURCED — see note below
 *
 * ⚠ TODO before this ships: the Intermittent Bleed default factor value
 * needs to be pulled from the actual current Subpart W Table W-2 (or the
 * relevant AP-42 chapter) and seeded as a real EmissionFactor row. Do not
 * guess a plausible-looking number for a compliance calculation — verify
 * against the source table first.
 *
 * Multiple controllers per facility are summed by the orchestrator.
 */
import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

export type PneumaticDeviceType =
  | 'CONTINUOUS_HIGH_BLEED'
  | 'INTERMITTENT_BLEED'
  | 'CONTINUOUS_LOW_BLEED'

export interface PneumaticInput {
  equipmentId: string
  equipmentTag: string
  pneumaticType: PneumaticDeviceType | null
  hoursOperated: number
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
  /** The factor row pulled from DB. value is scf-CH4/hr. */
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
    deviceCount = 1,
    isCountEstimated = false,
    factor,
  } = input

  if (factor.factorUnit !== 'scf-CH4/hr') {
    throw new Error(
      `calculatePneumatic expects factor in scf-CH4/hr, got: ${factor.factorUnit}`,
    )
  }

  // Emissions scale linearly with device count under the default-factor method
  const scfEmitted = factor.factorValue * hoursOperated * deviceCount
  const kgEmitted = scfToKg(scfEmitted, 'CH4')
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
    calculationMethod: 'SUBPART_W_PNEUMATIC_DEFAULT_FACTOR',
    emissionFactorId: factor.id,
    activityData: {
      // Field names below are chosen to map cleanly to EPA's XML schema
      // (PneumaticDeviceType, TotalNaturalGasDevices, IsCountsEstimated,
      // TotalVentedToAtmosphere, EstimatedAverageHoursInService) for the
      // eventual Subpart W export.
      pneumaticType: deviceTypeLabel,
      deviceCount,
      isCountEstimated,
      // All devices in this default-factor path are assumed to vent
      // 100% to atmosphere when in service — matches EPA's typical
      // assumption for continuously-venting device types.
      ventedToAtmosphereCount: deviceCount,
      hoursOperated,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      scfEmitted,
    },
    notes:
      `${deviceCount} ${deviceTypeLabel.toLowerCase().replace(/_/g, ' ')} controller(s), ` +
      `${hoursOperated.toFixed(0)} hours, count ${isCountEstimated ? 'estimated' : 'actual'}, ` +
      `factor from ${factor.source}.`,
  }
}
