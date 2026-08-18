/**
 * Atmospheric storage tanks — Calculation Method 3.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(j)(3),
 * Equations W-15A (hydrocarbon liquids) and W-15B (produced water).
 * VERIFIED against live eCFR text 2026-08-18.
 *
 * ── W-15A, hydrocarbon liquids ─────────────────────────────────────
 *   Es,i = EFi × Count × 1,000
 *
 *   EFi   = thousand scf per unit per YEAR, GHG-specific:
 *             crude oil      CH4 4.2   CO2 2.8
 *             gas condensate CH4 17.6  CO2 2.8
 *   Count = separators, wells, or non-separator equipment with annual
 *           average daily throughput > 0 and < 10 bbl/day that feed
 *           hydrocarbon liquids DIRECTLY to the atmospheric tank.
 *   1,000 = Mscf → scf
 *
 * ── W-15B, produced water ──────────────────────────────────────────
 *   MassCH4 = EFCH4 × FR × 0.001
 *
 *   EFCH4 = metric tons CH4 per thousand bbl produced water per year,
 *           tiered by the pressure of the feeding equipment:
 *             ≤ 50 psi           0.0015
 *             > 50 and ≤ 250 psi 0.0142
 *             > 250 psi          0.0508
 *   FR    = annual produced water to the tank, in barrels
 *   0.001 = bbl → thousand bbl
 *
 * ── Why this is NOT the W-1B chain ─────────────────────────────────
 *   • Factors are GHG-specific and ANNUAL — no whole-gas basis, no
 *     mole-fraction multiplication, no hours term.
 *   • W-15B yields MASS DIRECTLY in metric tons. Do not apply
 *     scfToKg() to it — that path would be off by ~50x.
 *   • W-15B is CH4 only; there is no produced-water CO2 factor.
 *
 * ── Applicability ──────────────────────────────────────────────────
 * Method 3 is the low-throughput path. Streams at or above 10 bbl/day
 * require Method 1 (process simulation software) or Method 2 (sampled
 * liquid composition) per §98.233(j)(1)-(2); neither is implemented,
 * and the orchestrator skips those units with a warning rather than
 * substituting a number.
 *
 * Tanks routing emissions to a vapor recovery system or flare require
 * the §98.233(j)(4) hours-based apportionment, including the rule that
 * an open thief hatch means 0% capture efficiency. That needs operating
 * hours, controlled hours, and thief-hatch hours that we do not model.
 * Those tanks are skipped, not estimated.
 *
 * Retires ef-seed-5 (1.86 lb-VOC/bbl citing the nonexistent "Table
 * W-10"). Subpart W tanks are CH4/CO2, not VOC; that factor was an
 * AP-42-style calculation mislabeled as Subpart W.
 */
import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

export type TankLiquidType = 'CRUDE_OIL' | 'GAS_CONDENSATE'
export type ProducedWaterPressureTier =
  | 'PRODUCED_WATER_LE_50PSI'
  | 'PRODUCED_WATER_50_250PSI'
  | 'PRODUCED_WATER_GT_250PSI'

/** Method 3 applies below this annual-average daily throughput. */
export const METHOD_3_MAX_BBL_PER_DAY = 10

/** Unit strings the factor rows must carry, per equation. */
export const W15A_FACTOR_UNIT = 'Mscf-GHG/yr/unit'
export const W15B_FACTOR_UNIT = 'mt-CH4/Mbbl'

/**
 * Select the W-15B pressure tier for the equipment feeding produced
 * water to the tank. Boundaries are inclusive at the top of each band
 * per §98.233(j)(3): ≤50, >50 and ≤250, >250.
 */
export function producedWaterTier(feedPressurePsig: number): ProducedWaterPressureTier {
  if (feedPressurePsig <= 50) return 'PRODUCED_WATER_LE_50PSI'
  if (feedPressurePsig <= 250) return 'PRODUCED_WATER_50_250PSI'
  return 'PRODUCED_WATER_GT_250PSI'
}

interface FactorRow {
  id: string
  factorValue: number
  factorUnit: string
  source: string
}

// ============================================================
// W-15A — hydrocarbon liquids
// ============================================================

export interface TankHydrocarbonInput {
  /** The feeding unit (separator / well / non-separator equipment). */
  equipmentId: string
  equipmentTag: string
  liquidType: TankLiquidType
  /** Annual average daily throughput, bbl/day. Must be >0 and <10. */
  dailyThroughputBbl: number
  /** CH4 factor row; factorValue in Mscf CH4/yr/unit. */
  ch4Factor: FactorRow
  /** CO2 factor row; factorValue in Mscf CO2/yr/unit. */
  co2Factor?: FactorRow
}

export function calculateTankHydrocarbonMethod3(
  input: TankHydrocarbonInput,
): MethodologyResult {
  const { equipmentId, equipmentTag, liquidType, dailyThroughputBbl, ch4Factor, co2Factor } =
    input

  if (ch4Factor.factorUnit !== W15A_FACTOR_UNIT) {
    // Hard-fails on the retired 'lb-VOC/bbl' row (ef-seed-5).
    throw new Error(
      `calculateTankHydrocarbonMethod3 expects factor in ${W15A_FACTOR_UNIT}, got: ` +
        `${ch4Factor.factorUnit}. If this is 'lb-VOC/bbl', the fabricated ` +
        `pre-2026-08 tank factor (ef-seed-5) is still active.`,
    )
  }
  if (!(dailyThroughputBbl > 0 && dailyThroughputBbl < METHOD_3_MAX_BBL_PER_DAY)) {
    throw new Error(
      `Method 3 requires throughput > 0 and < ${METHOD_3_MAX_BBL_PER_DAY} bbl/day, ` +
        `got: ${dailyThroughputBbl}. Streams at or above ${METHOD_3_MAX_BBL_PER_DAY} ` +
        `bbl/day require Calculation Method 1 or 2 per §98.233(j)(1)-(2).`,
    )
  }

  // Eq. W-15A: EFi × Count × 1000. One record per feeding unit, so Count = 1.
  const scfCh4 = ch4Factor.factorValue * 1 * 1000
  const scfCo2 = co2Factor ? co2Factor.factorValue * 1 * 1000 : 0

  const kgCh4 = scfToKg(scfCh4, 'CH4')
  const kgCo2 = scfCo2 > 0 ? scfToKg(scfCo2, 'CO2') : 0
  const mtCh4 = kgToMetricTons(kgCh4)
  const mtCo2 = kgToMetricTons(kgCo2)

  const co2Equivalent =
    toCo2Equivalent(mtCh4, 'CH4') + (mtCo2 > 0 ? toCo2Equivalent(mtCo2, 'CO2') : 0)

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'STORAGE_TANK',
    pollutant: 'CH4',
    calculatedQuantity: kgCh4,
    unit: 'kg',
    quantityMetricTons: mtCh4,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_EQ_W15A_TANK_METHOD_3',
    emissionFactorId: ch4Factor.id,
    activityData: {
      equation: 'W-15A',
      liquidType,
      dailyThroughputBbl,
      count: 1,
      ch4FactorValue: ch4Factor.factorValue,
      ch4FactorUnit: ch4Factor.factorUnit,
      co2FactorValue: co2Factor?.factorValue ?? null,
      scfCh4,
      scfCo2,
      mtCh4,
      mtCo2,
    },
    notes:
      `Atmospheric tank, hydrocarbon liquids from ${equipmentTag} ` +
      `(${liquidType.toLowerCase().replace(/_/g, ' ')}, ${dailyThroughputBbl} bbl/day). ` +
      `Eq. W-15A Calculation Method 3 per §98.233(j)(3): ${ch4Factor.factorValue} Mscf CH4/yr` +
      `${co2Factor ? ` + ${co2Factor.factorValue} Mscf CO2/yr` : ''} per feeding unit.`,
  }
}

// ============================================================
// W-15B — produced water
// ============================================================

export interface TankProducedWaterInput {
  equipmentId: string
  equipmentTag: string
  /** Annual produced water routed to the atmospheric tank, in barrels. */
  producedWaterBbl: number
  /** Representative pressure of the feeding equipment, psig. */
  feedPressurePsig: number
  /** Tier factor row; factorValue in metric tons CH4 per 1000 bbl. */
  factor: FactorRow
}

export function calculateTankProducedWaterMethod3(
  input: TankProducedWaterInput,
): MethodologyResult {
  const { equipmentId, equipmentTag, producedWaterBbl, feedPressurePsig, factor } = input

  if (factor.factorUnit !== W15B_FACTOR_UNIT) {
    throw new Error(
      `calculateTankProducedWaterMethod3 expects factor in ${W15B_FACTOR_UNIT}, ` +
        `got: ${factor.factorUnit}. W-15B yields mass directly — a volumetric ` +
        `factor here would be wrong by orders of magnitude.`,
    )
  }
  if (producedWaterBbl < 0) {
    throw new Error(`producedWaterBbl must be >= 0, got: ${producedWaterBbl}`)
  }
  if (feedPressurePsig < 0) {
    throw new Error(`feedPressurePsig must be >= 0, got: ${feedPressurePsig}`)
  }

  const tier = producedWaterTier(feedPressurePsig)

  // Eq. W-15B: MassCH4 = EF × FR × 0.001. MASS DIRECTLY — no density step.
  const mtCh4 = factor.factorValue * producedWaterBbl * 0.001
  const co2Equivalent = toCo2Equivalent(mtCh4, 'CH4')

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'STORAGE_TANK',
    pollutant: 'CH4',
    calculatedQuantity: mtCh4 * 1000, // kg, for the unit field
    unit: 'kg',
    quantityMetricTons: mtCh4,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_EQ_W15B_PRODUCED_WATER',
    emissionFactorId: factor.id,
    activityData: {
      equation: 'W-15B',
      producedWaterBbl,
      feedPressurePsig,
      pressureTier: tier,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      mtCh4,
    },
    notes:
      `Atmospheric tank, produced water from ${equipmentTag}: ` +
      `${producedWaterBbl.toFixed(0)} bbl/yr at ${feedPressurePsig} psig ` +
      `(${tier.replace(/PRODUCED_WATER_/, '').replace(/_/g, ' ').toLowerCase()} tier, ` +
      `${factor.factorValue} mt CH4 per 1,000 bbl). Eq. W-15B per §98.233(j)(3). ` +
      `CH4 only — no produced-water CO2 factor exists.`,
  }
}
