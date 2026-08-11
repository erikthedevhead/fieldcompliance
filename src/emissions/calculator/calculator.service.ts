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
 * 2026-08-05 EQUIPMENT LEAKS REWRITE: the fugitive component-count
 * heuristic (25 components/equipment × fabricated per-component factor)
 * is replaced by the verified Table W-1 major-equipment population method
 * (§98.233(r)). Each mapped equipment item gets its own leak record.
 * calculateFugitive / fugitive.ts is retired.
 *
 * NOTE: a compressor produces TWO records by design — rod-packing venting
 * (§98.233(p)) and an equipment leak (§98.233(r)). These are separate
 * source types in Subpart W, not double counting.
 */

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CalculationInput,
  CalculationResult,
  MethodologyResult,
  ActivityDataOverrides,
} from "./types";
import {
  hoursBetween,
  fractionOfYear,
  DEFAULT_CH4_MOLE_FRACTION,
} from "./units";
import { calculatePneumatic } from "./methodologies/pneumatic";
import { calculateStorageTank } from "./methodologies/storage-tank";
import { calculateCompressor } from "./methodologies/compressor";
import {
  calculateEquipmentLeak,
  LeakServiceType,
  MajorEquipmentType,
} from "./methodologies/equipment-leaks";

const DEFAULT_TANK_TURNOVERS_PER_YEAR = 12;

/**
 * EquipmentCategory → Table W-1 major-equipment row (§98.233(r) population
 * method). Categories not listed (pneumatics, flares, fugitive-component
 * placeholder rows) are not "major equipment" in Table W-1 and get no leak
 * record. HEATER is in Table W-1 but has no EquipmentCategory yet (schema
 * backlog).
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

/**
 * Platform default leak service type. Table W-1 has separate gas-service
 * and crude-service factor blocks; Facility has no serviceType field yet
 * (schema backlog), so we default to GAS and flag the assumption in
 * activityData — same pattern as DEFAULT_CH4_MOLE_FRACTION.
 */
const DEFAULT_LEAK_SERVICE_TYPE: LeakServiceType = "GAS";

@Injectable()
export class CalculatorService {
  private readonly logger = new Logger(CalculatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate emissions for a facility over a reporting period.
   * Does NOT persist results — call persistResults() separately.
   */
  async calculate(
    input: CalculationInput,
    orgId: string,
  ): Promise<CalculationResult> {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({
        where: { id: input.facilityId, orgId },
        include: {
          equipment: { where: { isActive: true } },
        },
      });
      if (!facility) {
        throw new NotFoundException("Facility not found");
      }

      const records: MethodologyResult[] = [];
      const periodHours = hoursBetween(input.periodStart, input.periodEnd);
      const overrides = input.activityData ?? {};

      // §98.233(u)(2): gas composition is facility-specific. Fall back to
      // the platform default only when no gas analysis is on file, and
      // flag the assumption so it shows in the provenance chain.
      const ch4Fraction =
        facility.ch4MoleFraction != null
          ? Number(facility.ch4MoleFraction)
          : DEFAULT_CH4_MOLE_FRACTION;
      const compositionAssumed = facility.ch4MoleFraction == null;
      if (compositionAssumed) {
        this.logger.warn(
          `Facility ${facility.id} has no ch4MoleFraction on file — ` +
            `using platform default ${DEFAULT_CH4_MOLE_FRACTION}. ` +
            `Provide a facility gas analysis for Subpart W fidelity.`,
        );
      }

      // ---- Pneumatic controllers (§98.233(a), Eq. W-1B) ----
      const pneumatics = facility.equipment.filter(
        (e) => e.category === "PNEUMATIC_CONTROLLER",
      );
      for (const pc of pneumatics) {
        const factor = await this.lookupFactor(
          tx,
          "PNEUMATIC_CONTROLLER",
          "CH4",
          pc.pneumaticType,
        );
        if (!factor) continue;
        const hours = overrides.pneumaticHours ?? periodHours;
        records.push(
          calculatePneumatic({
            equipmentId: pc.id,
            equipmentTag: pc.tag,
            pneumaticType: pc.pneumaticType,
            hoursOperated: hours,
            ch4MoleFraction: ch4Fraction,
            isCompositionAssumed: compositionAssumed,
            factor,
          }),
        );
      }

      // ---- Storage tanks (throughput calc — pending §98.233(j) rework) ----
      const tanks = facility.equipment.filter(
        (e) => e.category === "STORAGE_TANK",
      );
      for (const tank of tanks) {
        const factor = await this.lookupFactor(tx, "STORAGE_TANK", "VOC");
        if (!factor) continue;
        const throughput = this.resolveTankThroughput(
          tank,
          overrides,
          input.periodStart,
          input.periodEnd,
        );
        records.push(
          calculateStorageTank({
            equipmentId: tank.id,
            equipmentTag: tank.tag,
            throughputBbl: throughput,
            factor,
          }),
        );
      }

      // ---- Reciprocating compressors (rod packing — pending §98.233(p)
      //      factor verification; skips automatically if factor expired) ----
      const compressors = facility.equipment.filter(
        (e) => e.category === "COMPRESSOR_RECIPROCATING",
      );
      for (const comp of compressors) {
        const factor = await this.lookupFactor(
          tx,
          "COMPRESSOR_RECIPROCATING",
          "CH4",
        );
        if (!factor) continue;
        const hours = overrides.compressorHours ?? periodHours;
        const cylinders = this.estimateCylinders(comp);
        records.push(
          calculateCompressor({
            equipmentId: comp.id,
            equipmentTag: comp.tag,
            cylinders,
            hoursOperated: hours,
            factor,
          }),
        );
      }

      // ---- Equipment leaks (§98.233(r), Table W-1 major-equipment
      //      population method). One record per mapped equipment item. ----
      const serviceType = DEFAULT_LEAK_SERVICE_TYPE;
      const serviceTypeAssumed = true; // no Facility.leakServiceType yet
      for (const eq of facility.equipment) {
        const majorType = LEAK_MAJOR_EQUIPMENT_MAP[eq.category];
        if (!majorType) continue;
        const factor = await this.lookupFactor(
          tx,
          "FUGITIVE_COMPONENT",
          "CH4",
          `${majorType}_${serviceType}`,
        );
        if (!factor) continue;
        records.push(
          calculateEquipmentLeak({
            equipmentId: eq.id,
            equipmentTag: eq.tag,
            majorEquipmentType: majorType,
            serviceType,
            isServiceTypeAssumed: serviceTypeAssumed,
            hoursOperated: periodHours,
            ch4MoleFraction: ch4Fraction,
            isCompositionAssumed: compositionAssumed,
            factor,
          }),
        );
      }

      return this.aggregate(input, records);
    });
  }

  /**
   * Persist a CalculationResult as EmissionRecord rows.
   * Returns the count of records written.
   */
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
          `(${result.totals.co2eMetricTons.toFixed(2)} mt CO2e total)`,
      );
      return written;
    });
  }

  // ============================================================
  // INTERNAL HELPERS
  // ============================================================

  /**
   * Look up the active emission factor for a given equipment category,
   * pollutant, and (optionally) subType variant.
   *
   * subType semantics:
   *   - undefined → category has no variants; match any subType.
   *   - null / value → exact match on subType. An equipment row with an
   *     unspecified variant therefore finds NO factor and is skipped with
   *     a warning — a compliance calculation must never guess.
   *
   * EmissionFactor is a global reference table — not RLS scoped, but we
   * still accept a `tx` client so it participates in the caller's
   * transaction.
   */
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
        OR: [
          { applicableUntil: null },
          { applicableUntil: { gt: new Date() } },
        ],
      },
      orderBy: { applicableFrom: "desc" },
    });

    if (factors.length === 0) {
      this.logger.warn(
        `No active emission factor for ${equipmentCategory}/${pollutant}` +
          (subType !== undefined ? `/${subType ?? "NULL"}` : ""),
      );
      return null;
    }

    const chosen = factors[0];
    return {
      id: chosen.id,
      factorValue: Number(chosen.factorValue),
      factorUnit: chosen.factorUnit,
      source: chosen.source,
    };
  }

  private resolveTankThroughput(
    tank: { tankCapacityBbls: any },
    overrides: ActivityDataOverrides,
    periodStart: Date,
    periodEnd: Date,
  ): number {
    if (overrides.storageTankThroughputBbl !== undefined) {
      return overrides.storageTankThroughputBbl;
    }
    const capacity = Number(tank.tankCapacityBbls ?? 0);
    return (
      capacity *
      DEFAULT_TANK_TURNOVERS_PER_YEAR *
      fractionOfYear(periodStart, periodEnd)
    );
  }

  private estimateCylinders(comp: { compressorHp: number | null }): number {
    if (!comp.compressorHp) return 2;
    if (comp.compressorHp < 100) return 1;
    if (comp.compressorHp < 500) return 2;
    return Math.max(2, Math.round(comp.compressorHp / 250));
  }

  private inferEmissionSource(
    calculationMethod: string,
    equipmentCategory: string,
  ): string {
    // Equipment-leak records are FUGITIVE regardless of the equipment
    // category they attach to; everything else keeps the category rule.
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
    };
  }
}
