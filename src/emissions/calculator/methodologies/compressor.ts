/**
 * Reciprocating compressor rod packing emission calculation.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(p), Table W-7.
 * Per-cylinder vented rod packing factor × hours operated × cylinder count.
 *
 * For centrifugal compressors (wet seal / dry seal), a different factor
 * applies — not implemented in v1.
 *
 * For production-segment reciprocating compressors with measured packing
 * leak rate, Subpart W §98.233(p)(1) supersedes this Tier 1 factor approach.
 */

import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

export interface CompressorInput {
  equipmentId: string
  equipmentTag: string
  /** Cylinder count. Defaults to 1 if not specified on equipment record. */
  cylinders: number
  hoursOperated: number
  /** Factor row from DB. value is scf-CH4/hr/cylinder. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculateCompressor(input: CompressorInput): MethodologyResult {
  const { equipmentId, equipmentTag, cylinders, hoursOperated, factor } = input

  if (factor.factorUnit !== 'scf-CH4/hr/cylinder') {
    throw new Error(
      `calculateCompressor expects factor in scf-CH4/hr/cylinder, got: ${factor.factorUnit}`,
    )
  }

  const scfEmitted = factor.factorValue * cylinders * hoursOperated
  const kgEmitted = scfToKg(scfEmitted, 'CH4')
  const metricTons = kgToMetricTons(kgEmitted)
  const co2Equivalent = toCo2Equivalent(metricTons, 'CH4')

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'COMPRESSOR_RECIPROCATING',
    pollutant: 'CH4',
    calculatedQuantity: kgEmitted,
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_RECIP_COMPRESSOR',
    emissionFactorId: factor.id,
    activityData: {
      cylinders,
      hoursOperated,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      scfEmitted,
    },
    notes:
      `${cylinders} cylinder(s) × ${hoursOperated.toFixed(0)} hours × ` +
      `${factor.factorValue} scf/hr/cyl. Tier 1 factor — measured leak rates ` +
      `supersede per §98.233(p)(1).`,
  }
}
