/**
 * Fugitive component emission calculation (valves, connectors, open-ended lines).
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(r), Table W-4.
 * Average-emission-factor approach for the production segment.
 *
 * For OOOOb-regulated facilities, this Tier 1 factor calculation should
 * be supplemented with quarterly OGI survey results — leaks identified
 * by OGI are calculated separately per Subpart W §98.233(q).
 *
 * In v1 we use a count × factor approach. Component count is either
 * supplied by the user or estimated from facility equipment inventory
 * (a rough heuristic: ~25 fugitive components per major equipment item).
 */

import { shortToMetricTons, toCo2Equivalent, fractionOfYear } from '../units'
import { MethodologyResult } from '../types'

export interface FugitiveInput {
  /** Component count at the facility. */
  componentCount: number
  /** Reporting period start (for fraction-of-year math). */
  periodStart: Date
  /** Reporting period end. */
  periodEnd: Date
  /** Factor row from DB. value is tpy-CH4/component. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculateFugitive(input: FugitiveInput): MethodologyResult {
  const { componentCount, periodStart, periodEnd, factor } = input

  if (factor.factorUnit !== 'tpy-CH4/component') {
    throw new Error(
      `calculateFugitive expects factor in tpy-CH4/component, got: ${factor.factorUnit}`,
    )
  }

  // Factor is tons-per-year. Prorate for the reporting period.
  const periodFraction = fractionOfYear(periodStart, periodEnd)
  const shortTonsEmitted = factor.factorValue * componentCount * periodFraction
  const metricTons = shortToMetricTons(shortTonsEmitted)
  const co2Equivalent = toCo2Equivalent(metricTons, 'CH4')

  return {
    equipmentId: null,
    equipmentTag: null,
    equipmentCategory: 'FUGITIVE_COMPONENT',
    pollutant: 'CH4',
    calculatedQuantity: metricTons * 1000, // back to kg for the unit field
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_FUGITIVE_AVG_FACTOR',
    emissionFactorId: factor.id,
    activityData: {
      componentCount,
      periodFraction,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
    },
    notes:
      `${componentCount} components × ${factor.factorValue} tpy/component × ` +
      `${periodFraction.toFixed(3)} period fraction. Average-factor approach; ` +
      `OGI-identified leaks should be added separately.`,
  }
}
