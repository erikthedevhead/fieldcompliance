/**
 * Type contracts for the emission calculator.
 *
 * The calculator pipeline:
 *   CalculationInput → per-methodology functions → MethodologyResult[]
 *                  → orchestrator → CalculationResult (persisted as EmissionRecord rows)
 */

export type Pollutant = 'CH4' | 'CO2' | 'N2O' | 'VOC' | 'NOx'

/** Input to the top-level calculator service. */
export interface CalculationInput {
  facilityId: string
  periodStart: Date
  periodEnd: Date
  /**
   * Optional activity data overrides. When omitted, the calculator uses
   * sensible defaults (continuous operation, capacity-based throughput).
   */
  activityData?: ActivityDataOverrides
}

export interface ActivityDataOverrides {
  /** Hours pneumatic controllers operated in the period. Default: full period. */
  pneumaticHours?: number
  /** Hours compressors operated. Default: full period. */
  compressorHours?: number
  /** Hours glycol dehydrators operated. Default: full period. */
  dehydratorHours?: number
  /** Throughput per storage tank in bbl/period. Default: capacity × 12 turnovers/yr. */
  storageTankThroughputBbl?: number
  /** Number of fugitive components at the facility. Default: estimated from equipment count. */
  fugitiveComponentCount?: number
  /** Number of well completions in the period. Default: 0. */
  wellCompletions?: number
}

/**
 * Result of a single methodology calculation — one per (equipment, pollutant).
 * The orchestrator collects these and writes them as EmissionRecord rows.
 */
export interface MethodologyResult {
  equipmentId: string | null  // null = facility-wide (fugitives, completions)
  equipmentTag: string | null
  equipmentCategory: string
  pollutant: Pollutant
  /** The calculated emission quantity. */
  calculatedQuantity: number
  unit: string                // e.g. "kg", "scf", "mt"
  /** Same emission expressed in metric tons. Used for rollup math. */
  quantityMetricTons: number
  /** Mass × GWP. Only meaningful for GHG pollutants (CH4, CO2, N2O). */
  co2Equivalent: number
  /** Method used — appears in audit log. */
  calculationMethod: string   // e.g. "AP42_PNEUMATIC_FACTOR", "SUBPART_W_TANK"
  /** EmissionFactor row id used (null for direct measurement methods). */
  emissionFactorId: string | null
  /** Raw inputs preserved for audit. */
  activityData: Record<string, any>
  /** Human-readable notes about assumptions made. */
  notes?: string
}

/** Aggregate result for the whole facility for a period. */
export interface CalculationResult {
  facilityId: string
  periodStart: Date
  periodEnd: Date
  records: MethodologyResult[]
  totals: {
    /** Total CO2e in metric tons. */
    co2eMetricTons: number
    /** Per-pollutant mass totals in metric tons. */
    byPollutant: Record<string, number>
  }
}
