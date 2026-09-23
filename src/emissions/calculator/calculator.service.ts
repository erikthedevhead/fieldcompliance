/**
 * Emission calculator orchestration.
 *
 * Walks a facility's active equipment, dispatches each item to the right
 * methodology function, aggregates results, and (optionally) persists them
 * as EmissionRecord rows.
 *
 * Methodology functions are pure and don't touch Prisma — only this service
 * does, so the methodology layer is fully unit-testable in isolation.
 *
 * 2026-08-18 SKIPPED-EQUIPMENT TRACKING: every place this orchestrator
 * declines to emit a record now records a SkippedEquipment entry with a
 * reason and, where applicable, a remedy. A compliance calculation that
 * silently omits a source is worse than one that reports zero — the reader
 * cannot distinguish "no emissions" from "we had no idea".
 *
 * Verified methodologies (all against live eCFR):
 *   Pneumatics          §98.233(a)      Eq. W-1B      Table W-1
 *   Equipment leaks     §98.233(r)      population    Table W-1 major equipment
 *   Compressor packing  §98.233(p)(10)  Eq. W-29E
 *   Tanks, liquids      §98.233(j)(3)   Eq. W-15A     Method 3
 *   Tanks, water        §98.233(j)(3)   Eq. W-15B     Method 3
 */

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CalculationInput,
  CalculationResult,
  MethodologyResult,
  SkippedEquipment,
  ActivityDataOverrides,
} from "./types";
import { hoursBetween, DEFAULT_CH4_MOLE_FRACTION } from "./units";
import { calculatePneumatic } from "./methodologies/pneumatic";
import {
  calculateEquipmentLeak,
  LeakServiceType,
  MajorEquipmentType,
} from "./methodologies/equipment-leaks";
import { calculateCompressorRodPacking } from "./methodologies/compressor-rod-packing";
import {
  calculateTankHydrocarbonMethod3,
  calculateTankProducedWaterMethod3,
  producedWaterTier,
  METHOD_3_MAX_BBL_PER_DAY,
} from "./methodologies/storage-tank-method3";

/**
 * EquipmentCategory → Table W-1 major-equipment row (§98.233(r)).
 * Categories not listed are not "major equipment" and get no leak record.
 */
const LEAK_MAJOR_EQUIPMENT_MAP: Record<string, MajorEquipmentType> = {
  WELLHEAD: "WELLHEAD",
  SEPARATOR: "SEPARATOR",
  METER_SEPARATOR: "METERS_PIPING",
  COMPRESSOR_RECIPROCATING: "COMPRESSOR",
  COMPRESSOR_CENTRIFUGAL: "COMPRESSOR",
  DEHYDRATOR_GLYCOL: "DEHYDRATOR",
  STORAGE_TANK: "STORAGE_VESSEL",
};

/** Table W-1 has separate gas- and crude-service blocks; no field yet. */
const DEFAULT_LEAK_SERVICE_TYPE: LeakServiceType = "GAS";

@Injectable()
export class CalculatorService {
  private readonly logger = new Logger(CalculatorService.name);

  constructor(private prisma: PrismaService) {}

  async calculate(
    input: CalculationInput,
    orgId: string,
  ): Promise<CalculationResult> {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({
        where: { id: input.facilityId, orgId },
        include: { equipment: { where: { isActive: true } } },
      });
      if (!facility) throw new NotFoundException("Facility not found");

      const records: MethodologyResult[] = [];
      const skipped: SkippedEquipment[] = [];
      const periodHours = hoursBetween(input.periodStart, input.periodEnd);
      const overrides = input.activityData ?? {};

      const skip = (
        eq: { id: string; tag: string; category: string } | null,
        code: SkippedEquipment["code"],
        reason: string,
        remedy?: string,
      ) => {
        skipped.push({
          equipmentId: eq?.id ?? null,
          equipmentTag: eq?.tag ?? null,
          equipmentCategory: eq?.category ?? "FACILITY",
          code,
          reason,
          remedy,
        });
        this.logger.warn(
          `[skipped] ${eq?.tag ?? "facility"} (${code}): ${reason}`,
        );
      };

      // §98.233(u)(2): gas composition is facility-specific.
      const ch4Fraction =
        facility.ch4MoleFraction != null
          ? Number(facility.ch4MoleFraction)
          : DEFAULT_CH4_MOLE_FRACTION;
      const compositionAssumed = facility.ch4MoleFraction == null;
      const co2Fraction =
        facility.co2MoleFraction != null ? Number(facility.co2MoleFraction) : 0;
      if (compositionAssumed) {
        this.logger.warn(
          `Facility ${facility.id} has no ch4MoleFraction — using platform ` +
            `default ${DEFAULT_CH4_MOLE_FRACTION}.`,
        );
      }

      // ---- Pneumatic controllers (§98.233(a), Eq. W-1B) ----
      const pneumatics = facility.equipment.filter(
        (e) => e.category === "PNEUMATIC_CONTROLLER",
      );
      for (const pc of pneumatics) {
        if (!pc.pneumaticType) {
          skip(
            pc,
            "MISSING_PNEUMATIC_TYPE",
            "No pneumatic device type recorded. A compliance calculation must never guess which Table W-1 factor applies.",
            "Set the device type to continuous high-bleed, continuous low-bleed, or intermittent bleed.",
          );
          continue;
        }
        const factor = await this.lookupFactor(
          tx,
          "PNEUMATIC_CONTROLLER",
          "CH4",
          pc.pneumaticType,
        );
        if (!factor) {
          skip(
            pc,
            "NO_ACTIVE_FACTOR",
            `No active emission factor for pneumatic type ${pc.pneumaticType}.`,
            "Contact support — the factor table may be out of date.",
          );
          continue;
        }
        records.push(
          calculatePneumatic({
            equipmentId: pc.id,
            equipmentTag: pc.tag,
            pneumaticType: pc.pneumaticType,
            hoursOperated: overrides.pneumaticHours ?? periodHours,
            ch4MoleFraction: ch4Fraction,
            isCompositionAssumed: compositionAssumed,
            factor,
          }),
        );
      }

      // ---- Atmospheric storage tanks, Method 3 (§98.233(j)(3)) ----
      for (const tank of facility.equipment.filter(
        (e) => e.category === "STORAGE_TANK" && (e as any).routesToVruOrFlare,
      )) {
        skip(
          tank,
          "TANK_ROUTED_TO_VRU_OR_FLARE",
          "Tank routes emissions to a vapor recovery system or flare. §98.233(j)(4) requires hours-based apportionment, including treating an open thief hatch as 0% capture.",
          "Not yet supported. Tank emissions for this unit are omitted from the total.",
        );
      }

      for (const unit of facility.equipment.filter(
        (e) => (e as any).feedsAtmosphericTank,
      )) {
        const throughput = (unit as any).dailyThroughputBbl;
        const liquidType = (unit as any).liquidType;

        if (throughput != null && liquidType) {
          const bblPerDay = Number(throughput);
          if (bblPerDay <= 0 || bblPerDay >= METHOD_3_MAX_BBL_PER_DAY) {
            skip(
              unit,
              "TANK_THROUGHPUT_ABOVE_METHOD_3",
              `Throughput of ${bblPerDay} bbl/day is outside Calculation Method 3 (must be >0 and <${METHOD_3_MAX_BBL_PER_DAY}).`,
              "Streams at or above 10 bbl/day require Method 1 (process simulation) or Method 2 (sampled liquid composition), neither of which is implemented yet.",
            );
          } else {
            const ch4Factor = await this.lookupFactor(
              tx,
              "STORAGE_TANK",
              "CH4",
              `${liquidType}_CH4`,
            );
            const co2Factor = await this.lookupFactor(
              tx,
              "STORAGE_TANK",
              "CO2",
              `${liquidType}_CO2`,
            );
            if (!ch4Factor) {
              skip(
                unit,
                "NO_ACTIVE_FACTOR",
                `No active W-15A factor for liquid type ${liquidType}.`,
              );
            } else {
              records.push(
                calculateTankHydrocarbonMethod3({
                  equipmentId: unit.id,
                  equipmentTag: unit.tag,
                  liquidType,
                  dailyThroughputBbl: bblPerDay,
                  ch4Factor,
                  co2Factor: co2Factor ?? undefined,
                }),
              );
            }
          }
        }

        const water = (unit as any).producedWaterBblPerYear;
        const pressure = (unit as any).feedPressurePsig;
        if (water != null && Number(water) > 0) {
          if (pressure == null) {
            skip(
              unit,
              "TANK_MISSING_FEED_PRESSURE",
              "Produced water volume is recorded but the feeding equipment pressure is not. The W-15B factor spans a 33.9x range across pressure tiers.",
              "Record the representative separator/wellhead pressure in psig.",
            );
          } else {
            const tier = producedWaterTier(Number(pressure));
            const waterFactor = await this.lookupFactor(
              tx,
              "STORAGE_TANK",
              "CH4",
              tier,
            );
            if (!waterFactor) {
              skip(unit, "NO_ACTIVE_FACTOR", `No active W-15B factor for ${tier}.`);
            } else {
              records.push(
                calculateTankProducedWaterMethod3({
                  equipmentId: unit.id,
                  equipmentTag: unit.tag,
                  producedWaterBbl: Number(water),
                  feedPressurePsig: Number(pressure),
                  factor: waterFactor,
                }),
              );
            }
          }
        }
      }

      // ---- Reciprocating compressor rod packing (§98.233(p)(10)(iv)) ----
      const totalHoursInYear =
        new Date(input.periodEnd).getUTCFullYear() % 4 === 0 ? 8784 : 8760;
      for (const comp of facility.equipment.filter(
        (e) => e.category === "COMPRESSOR_RECIPROCATING",
      )) {
        if ((comp as any).isSubjectToOOOObCompressorStandards) {
          skip(
            comp,
            "COMPRESSOR_REQUIRES_MEASUREMENT",
            "Subject to the OOOOb reciprocating compressor standards in §60.5385b. Volumetric emissions must be measured on the §60.5385b(a) schedule — no emission factor substitute is permitted.",
            "Record measured emissions, or confirm this compressor is not subject to §60.5385b.",
          );
          continue;
        }
        if ((comp as any).ventedToAtmosphere === false) {
          skip(
            comp,
            "NOT_VENTED_TO_ATMOSPHERE",
            "Rod packing emissions route to a flare, combustion, or vapor recovery system. §98.233(p) does not require them to be determined.",
          );
          continue;
        }
        const ch4Factor = await this.lookupFactor(
          tx,
          "COMPRESSOR_RECIPROCATING",
          "CH4",
          "ROD_PACKING_CH4",
        );
        if (!ch4Factor) {
          skip(comp, "NO_ACTIVE_FACTOR", "No active W-29E rod packing factor.");
          continue;
        }
        const co2Factor = await this.lookupFactor(
          tx,
          "COMPRESSOR_RECIPROCATING",
          "CO2",
          "ROD_PACKING_CO2",
        );
        records.push(
          calculateCompressorRodPacking({
            equipmentId: comp.id,
            equipmentTag: comp.tag,
            operatingHours:
              (comp as any).operatingHours ??
              overrides.compressorHours ??
              Math.min(periodHours, totalHoursInYear),
            totalHoursInYear,
            ch4MoleFraction: ch4Fraction,
            co2MoleFraction: co2Fraction,
            isCompositionAssumed: compositionAssumed,
            ch4Factor,
            co2Factor: co2Factor ?? undefined,
          }),
        );
      }

      // ---- Equipment leaks (§98.233(r), Table W-1 major equipment) ----
      const serviceType = DEFAULT_LEAK_SERVICE_TYPE;
      for (const eq of facility.equipment) {
        const majorType = LEAK_MAJOR_EQUIPMENT_MAP[eq.category];
        if (!majorType) continue; // not major equipment; nothing is owed
        const factor = await this.lookupFactor(
          tx,
          "FUGITIVE_COMPONENT",
          "CH4",
          `${majorType}_${serviceType}`,
        );
        if (!factor) {
          skip(
            eq,
            "NO_ACTIVE_FACTOR",
            `No active equipment-leak factor for ${majorType} in ${serviceType} service.`,
          );
          continue;
        }
        records.push(
          calculateEquipmentLeak({
            equipmentId: eq.id,
            equipmentTag: eq.tag,
            majorEquipmentType: majorType,
            serviceType,
            isServiceTypeAssumed: true,
            hoursOperated: periodHours,
            ch4MoleFraction: ch4Fraction,
            isCompositionAssumed: compositionAssumed,
            factor,
          }),
        );
      }

      return this.aggregate(input, records, skipped);
    });
  }

  async persistResults(
    orgId: string,
    result: CalculationResult,
  ): Promise<number> {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({
        where: { id: result.facilityId, orgId },
        select: { id: true },
      });
      if (!facility) throw new NotFoundException("Facility not found");

      let written = 0;
      for (const rec of result.records) {
        await tx.emissionRecord.create({
          data: {
            facilityId: result.facilityId,
            equipmentId: rec.equipmentId,
            reportingPeriodStart: result.periodStart,
            reportingPeriodEnd: result.periodEnd,
            emissionSource: this.inferEmissionSource(
              rec.calculationMethod,
              rec.equipmentCategory,
            ) as any,
            pollutant: rec.pollutant,
            calculationMethod: rec.calculationMethod,
            emissionFactorId: rec.emissionFactorId,
            activityData: rec.activityData,
            calculatedQuantity: rec.calculatedQuantity,
            unit: rec.unit,
            co2Equivalent: rec.co2Equivalent,
            notes: rec.notes,
          },
        });
        written++;
      }

      this.logger.log(
        `Persisted ${written} emission records for facility ${result.facilityId} ` +
          `(${result.totals.co2eMetricTons.toFixed(2)} mt CO2e total, ` +
          `${result.skipped.length} equipment skipped)`,
      );
      return written;
    });
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  private async lookupFactor(
    tx: any,
    equipmentCategory: string,
    pollutant: string,
    subType?: string | null,
  ): Promise<{
    id: string;
    factorValue: number;
    factorUnit: string;
    source: string;
  } | null> {
    const factors = await tx.emissionFactor.findMany({
      where: {
        equipmentCategory: equipmentCategory as any,
        pollutant,
        ...(subType !== undefined ? { subType } : {}),
        applicableFrom: { lte: new Date() },
        OR: [{ applicableUntil: null }, { applicableUntil: { gt: new Date() } }],
      },
      orderBy: { applicableFrom: "desc" },
    });
    if (factors.length === 0) return null;
    const chosen = factors[0];
    return {
      id: chosen.id,
      factorValue: Number(chosen.factorValue),
      factorUnit: chosen.factorUnit,
      source: chosen.source,
    };
  }

  private inferEmissionSource(
    calculationMethod: string,
    equipmentCategory: string,
  ): string {
    if (calculationMethod === "SUBPART_W_LEAK_MAJOR_EQUIPMENT_POPULATION") {
      return "FUGITIVE";
    }
    switch (equipmentCategory) {
      case "FUGITIVE_COMPONENT":
        return "FUGITIVE";
      case "FLARE_SYSTEM":
        return "FLARING";
      default:
        return "VENTING";
    }
  }

  private aggregate(
    input: CalculationInput,
    records: MethodologyResult[],
    skipped: SkippedEquipment[],
  ): CalculationResult {
    let co2eMetricTons = 0;
    const byPollutant: Record<string, number> = {};

    for (const r of records) {
      co2eMetricTons += r.co2Equivalent;
      byPollutant[r.pollutant] =
        (byPollutant[r.pollutant] ?? 0) + r.quantityMetricTons;
    }

    return {
      facilityId: input.facilityId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      records,
      totals: { co2eMetricTons, byPollutant },
      skipped,
    };
  }
}
