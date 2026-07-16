/**
 * Storage tank emission calculation (working + breathing losses).
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(j), Table W-10.
 *
 * Tier 1 (this implementation): use the AP-42 throughput-based factor.
 *   Activity data: bbl throughput in the period
 *   Factor: lb VOC per bbl (Subpart W Table W-10 for crude/condensate)
 *
 * Tier 2 (future): site-specific E&P TANK 3.0 model with full vent gas
 *   composition. Required when potential VOC ≥ 6 tpy per OOOOb.
 * Tier 3 (future): direct measurement.
 *
 * For tanks where vent gas composition is known to have significant CH4,
 * a separate Subpart W §98.233(j)(2) calc applies. Not implemented in v1.
 */

import { lbToKg, kgToMetricTons } from '../units'
import { MethodologyResult } from '../types'

export interface StorageTankInput {
  equipmentId: string
  equipmentTag: string
  /** Total bbl throughput in the reporting period. */
  throughputBbl: number
  /** Factor row from DB. value is lb-VOC/bbl. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculateStorageTank(input: StorageTankInput): MethodologyResult {
  const { equipmentId, equipmentTag, throughputBbl, factor } = input

  if (factor.factorUnit !== 'lb-VOC/bbl') {
    throw new Error(
      `calculateStorageTank expects factor in lb-VOC/bbl, got: ${factor.factorUnit}`,
    )
  }

  const lbEmitted = factor.factorValue * throughputBbl
  const kgEmitted = lbToKg(lbEmitted)
  const metricTons = kgToMetricTons(kgEmitted)

  // VOC is not GHG-weighted, so co2Equivalent is 0 here.
  // (A future Tier 2 calc would compute CH4 separately and apply GWP.)
  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'STORAGE_TANK',
    pollutant: 'VOC',
    calculatedQuantity: kgEmitted,
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent: 0,
    calculationMethod: 'AP42_TANK_THROUGHPUT',
    emissionFactorId: factor.id,
    activityData: {
      throughputBbl,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      lbEmitted,
    },
    notes:
      `Tier 1 throughput-based calc. ${throughputBbl.toFixed(0)} bbl × ` +
      `${factor.factorValue} lb/bbl. For tanks ≥6 tpy VOC potential, OOOOb requires ` +
      `Tier 2 (E&P TANK) with vapor control verification.`,
  }
}
