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
 * NOTE: persistResults() signature changed to require orgId as first
 * parameter. Update the caller (emissions.controller.ts) accordingly.
 */

import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CalculationInput,
  CalculationResult,
  MethodologyResult,
  ActivityDataOverrides,
} from "./types";
import { hoursBetween, fractionOfYear } from "./units";
import { calculatePneumatic } from "./methodologies/pneumatic";
import { calculateStorageTank } from "./methodologies/storage-tank";
import { calculateCompressor } from "./methodologies/compressor";
import { calculateFugitive } from "./methodologies/fugitive";

const DEFAULT_TANK_TURNOVERS_PER_YEAR = 12;
const DEFAULT_FUGITIVE_COMPONENTS_PER_EQUIPMENT = 25;

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

      // ---- Pneumatic controllers ----
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
            factor,
          }),
        );
      }

      // ---- Storage tanks ----
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

      // ---- Reciprocating compressors ----
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

      // ---- Fugitive components (facility-wide) ----
      const factor = await this.lookupFactor(tx, "FUGITIVE_COMPONENT", "CH4");
      if (factor) {
        const componentCount =
          overrides.fugitiveComponentCount ??
          facility.equipment.length * DEFAULT_FUGITIVE_COMPONENTS_PER_EQUIPMENT;
        if (componentCount > 0) {
          records.push(
            calculateFugitive({
              componentCount,
              periodStart: input.periodStart,
              periodEnd: input.periodEnd,
              factor,
            }),
          );
        }
      }

      return this.aggregate(input, records);
    });
  }

  /**
   * Persist a CalculationResult as EmissionRecord rows.
   * Returns the count of records written.
   *
   * SIGNATURE CHANGE: now requires orgId for RLS scoping.
   * Update emissions.controller.ts to pass user.orgId as first argument.
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
   * Look up the active emission factor for a given equipment category and pollutant.
   * EmissionFactor is a global reference table — not RLS scoped, but we still
   * accept a `tx` client so it participates in the caller's transaction.
   */
  private async lookupFactor(
    tx: any,
    equipmentCategory: string,
    pollutant: string,
    pneumaticType?: string | null,
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
        `No emission factor found for ${equipmentCategory}/${pollutant}`,
      );
      return null;
    }

    let chosen = factors[0];

    if (equipmentCategory === "PNEUMATIC_CONTROLLER" && factors.length > 1) {
      if (pneumaticType === "CONTINUOUS_HIGH_BLEED") {
        chosen =
          factors.find((f: any) =>
            f.notes?.toLowerCase().includes("high-bleed"),
          ) ?? chosen;
      } else if (pneumaticType === "INTERMITTENT_BLEED") {
        chosen =
          factors.find((f: any) =>
            f.notes?.toLowerCase().includes("intermittent"),
          ) ?? chosen;
      } else {
        chosen =
          factors.find((f: any) =>
            f.notes?.toLowerCase().includes("low-bleed"),
          ) ?? chosen;
      }
    }
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

  private inferEmissionSource(equipmentCategory: string): string {
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
