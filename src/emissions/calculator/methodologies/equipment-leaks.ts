/**
 * Equipment leak emission calculation — major-equipment population method.
 *
 * Methodology reference: 40 CFR Part 98 Subpart W §98.233(r), using the
 * "Population Emission Factors — Major Equipment" block of Table W-1
 * (89 FR 42323, May 14 2024, eff. 2025-01-01), onshore petroleum and
 * natural gas production segment.
 *
 * VERIFIED against live eCFR 2026-08-05. Factors are per MAJOR EQUIPMENT
 * UNIT (wellhead, separator, etc.), in scf WHOLE GAS/hour/unit — NOT per
 * component. This replaces the retired fugitive.ts, which used a
 * fabricated per-component tpy factor (ef-seed-2) and a 25-components-
 * per-equipment heuristic with no CFR basis.
 *
 * Gas service and crude service have different factors (Table W-1 has
 * two blocks). Service type is a facility-level input; when it is not
 * on file we default to GAS service and flag the assumption in
 * activityData, mirroring the ch4MoleFraction assumption pattern.
 *
 * Chain is identical to pneumatics (Eq. W-1B shape):
 *   scfWholeGas = EF × count × hours
 *   scfCH4      = scfWholeGas × ch4MoleFraction   (§98.233(u)(2))
 *   mass, CO2e  = §98.233(v) densities, Table A-1 GWP
 */
import { scfToKg, kgToMetricTons, toCo2Equivalent } from '../units'
import { MethodologyResult } from '../types'

export type LeakServiceType = 'GAS' | 'CRUDE'

/** Unit string every Table W-1 major-equipment factor row must carry. */
export const LEAK_FACTOR_UNIT = 'scf-whole-gas/hr'

/**
 * Table W-1 major-equipment keys. Maps from EquipmentCategory in
 * calculator.service.ts; HEATER has no EquipmentCategory yet (schema
 * backlog item) but is included here so the factor rows can be seeded.
 */
export type MajorEquipmentType =
  | 'WELLHEAD'
  | 'SEPARATOR'
  | 'METERS_PIPING'
  | 'COMPRESSOR'
  | 'DEHYDRATOR'
  | 'HEATER'
  | 'STORAGE_VESSEL'

export interface EquipmentLeakInput {
  equipmentId: string
  equipmentTag: string
  /** Which Table W-1 major-equipment row applies. */
  majorEquipmentType: MajorEquipmentType
  /** GAS or CRUDE service — selects the Table W-1 block. */
  serviceType: LeakServiceType
  /** True when serviceType came from the platform default, not user data. */
  isServiceTypeAssumed?: boolean
  hoursOperated: number
  /** CH4 mole fraction of produced gas, 0–1 (§98.233(u)(2)). */
  ch4MoleFraction: number
  isCompositionAssumed?: boolean
  /** Factor row from DB. value is scf whole gas/hr/unit. */
  factor: {
    id: string
    factorValue: number
    factorUnit: string
    source: string
  }
}

export function calculateEquipmentLeak(
  input: EquipmentLeakInput,
): MethodologyResult {
  const {
    equipmentId,
    equipmentTag,
    majorEquipmentType,
    serviceType,
    isServiceTypeAssumed = false,
    hoursOperated,
    ch4MoleFraction,
    isCompositionAssumed = false,
    factor,
  } = input

  if (factor.factorUnit !== LEAK_FACTOR_UNIT) {
    // Hard-fails on the legacy 'tpy-CH4/component' row (ef-seed-2) so the
    // fabricated per-component factor can never silently produce a number.
    throw new Error(
      `calculateEquipmentLeak expects factor in ${LEAK_FACTOR_UNIT}, got: ` +
        `${factor.factorUnit}. If this is 'tpy-CH4/component', the retired ` +
        `fugitive factor row (ef-seed-2) is still active — run the Table W-1 ` +
        `equipment-leak factor correction.`,
    )
  }
  if (!(ch4MoleFraction > 0 && ch4MoleFraction <= 1)) {
    throw new Error(
      `ch4MoleFraction must be in (0, 1], got: ${ch4MoleFraction}`,
    )
  }

  // Eq. W-1B chain: whole gas → CH4 volume → mass → CO2e
  const scfWholeGas = factor.factorValue * hoursOperated
  const scfCh4 = scfWholeGas * ch4MoleFraction
  const kgEmitted = scfToKg(scfCh4, 'CH4')
  const metricTons = kgToMetricTons(kgEmitted)
  const co2Equivalent = toCo2Equivalent(metricTons, 'CH4')

  return {
    equipmentId,
    equipmentTag,
    equipmentCategory: 'FUGITIVE_COMPONENT',
    pollutant: 'CH4',
    calculatedQuantity: kgEmitted,
    unit: 'kg',
    quantityMetricTons: metricTons,
    co2Equivalent,
    calculationMethod: 'SUBPART_W_LEAK_MAJOR_EQUIPMENT_POPULATION',
    emissionFactorId: factor.id,
    activityData: {
      majorEquipmentType,
      serviceType,
      assumedServiceType: isServiceTypeAssumed,
      hoursOperated,
      factorValue: factor.factorValue,
      factorUnit: factor.factorUnit,
      ch4MoleFraction,
      assumedComposition: isCompositionAssumed,
      scfWholeGas,
      scfCh4,
    },
    notes:
      `Equipment leak, ${majorEquipmentType.toLowerCase().replace(/_/g, ' ')} ` +
      `(${serviceType.toLowerCase()} service${isServiceTypeAssumed ? ', assumed' : ''}), ` +
      `${hoursOperated.toFixed(0)} hours × ${factor.factorValue} scf whole gas/hr/unit, ` +
      `CH4 fraction ${ch4MoleFraction}${isCompositionAssumed ? ' (platform default)' : ''}. ` +
      `Table W-1 major-equipment population method per §98.233(r).`,
  }
}
