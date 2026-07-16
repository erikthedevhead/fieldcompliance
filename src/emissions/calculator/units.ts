/**
 * Unit conversion constants and helpers.
 *
 * All references trace back to EPA-published values. This file is the
 * single source of truth for any numeric constant used in emission
 * calculations — DO NOT scatter these magic numbers across methodologies.
 *
 * References:
 *   - 40 CFR Part 98 Subpart A — Table A-1 (Global Warming Potentials)
 *   - 40 CFR Part 98 Subpart W — Tables W-2 through W-10 (emission factors)
 *   - AP-42, 5th Edition — supplemental factors
 *   - EPA Gas STAR methane/VOC properties (NIST cross-referenced)
 */

// ============================================================
// MASS DENSITIES — at standard conditions (60°F, 14.7 psia)
// ============================================================

/** Methane (CH4) density at standard conditions, kg/scf */
export const CH4_KG_PER_SCF = 0.01926

/** Carbon dioxide (CO2) density at standard conditions, kg/scf */
export const CO2_KG_PER_SCF = 0.05295

/** Nitrous oxide (N2O) density at standard conditions, kg/scf */
export const N2O_KG_PER_SCF = 0.05295

// ============================================================
// MASS CONVERSIONS
// ============================================================

/** Pounds to kilograms */
export const LB_PER_KG = 2.20462

/** Kilograms in one metric ton */
export const KG_PER_METRIC_TON = 1000

/** Kilograms in one short ton (US ton) */
export const KG_PER_SHORT_TON = 907.185

/** Metric tons per short ton */
export const METRIC_TON_PER_SHORT_TON = 0.907185

// ============================================================
// GLOBAL WARMING POTENTIALS (100-year, IPCC AR5)
// Per 40 CFR Part 98 Subpart A Table A-1, updated 2024.
// ============================================================

export const GWP: Record<string, number> = {
  CO2: 1,
  CH4: 28,
  N2O: 265,
  VOC: 0, // VOC is not GHG-weighted; tracked separately
  NOx: 0,
}

// ============================================================
// TIME
// ============================================================

export const HOURS_PER_YEAR = 8760

/** Hours between two dates. Returns fractional hours. */
export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

// ============================================================
// PURE CONVERSION HELPERS
// ============================================================

/** scf → kg for a given pollutant. Returns null if no density known. */
export function scfToKg(scf: number, pollutant: string): number {
  const densities: Record<string, number> = {
    CH4: CH4_KG_PER_SCF,
    CO2: CO2_KG_PER_SCF,
    N2O: N2O_KG_PER_SCF,
  }
  const density = densities[pollutant]
  if (density === undefined) {
    throw new Error(`No density defined for pollutant: ${pollutant}`)
  }
  return scf * density
}

/** Pounds → kilograms */
export function lbToKg(lb: number): number {
  return lb / LB_PER_KG
}

/** Kilograms → metric tons */
export function kgToMetricTons(kg: number): number {
  return kg / KG_PER_METRIC_TON
}

/** Short tons → metric tons */
export function shortToMetricTons(shortTons: number): number {
  return shortTons * METRIC_TON_PER_SHORT_TON
}

/**
 * Convert a quantity in any supported unit to metric tons.
 * Returns null if the unit isn't recognized.
 */
export function toMetricTons(quantity: number, unit: string, pollutant?: string): number | null {
  switch (unit.toLowerCase()) {
    case 'mt':
    case 'mt-co2e':
    case 'metric_ton':
    case 'metric-ton':
      return quantity
    case 'kg':
      return kgToMetricTons(quantity)
    case 'lb':
      return kgToMetricTons(lbToKg(quantity))
    case 'short_ton':
    case 'short-ton':
    case 'ton':
    case 'tpy':
      return shortToMetricTons(quantity)
    case 'scf':
      if (!pollutant) return null
      return kgToMetricTons(scfToKg(quantity, pollutant))
    default:
      return null
  }
}

/** Convert pollutant mass (in metric tons) to CO2-equivalent. */
export function toCo2Equivalent(metricTons: number, pollutant: string): number {
  const gwp = GWP[pollutant]
  if (gwp === undefined) {
    throw new Error(`No GWP defined for pollutant: ${pollutant}`)
  }
  return metricTons * gwp
}

/**
 * Fraction of a year covered by a period. Used to prorate annual
 * emission factors when the reporting period isn't a full year.
 */
export function fractionOfYear(periodStart: Date, periodEnd: Date): number {
  return hoursBetween(periodStart, periodEnd) / HOURS_PER_YEAR
}
