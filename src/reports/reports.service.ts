import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { BasinsService, UNRESOLVED_BASIN } from '../basins/basins.service'

/** Subpart W applicability threshold, 40 CFR 98.231(a). */
export const SUBPART_W_THRESHOLD_MT_CO2E = 25000

export interface GenerateReportInput {
  reportType: 'SUBPART_W'
  reportingYear: number
  facilityId?: string
  basinCode?: string
}

export interface ReportRecord {
  equipmentTag: string | null
  calculationMethod: string
  pollutant: string
  quantityMt: number
  co2eMt: number
  citation: string | null
  factorSource: string | null
  assumptions: string[]
  notes: string | null
}

export interface ReportFacility {
  id: string
  name: string
  apiWellNumber: string | null
  state: string
  county: string | null
  records: ReportRecord[]
  totals: { ch4Mt: number; co2eMt: number }
}

/**
 * A basin is EPA's actual reporting facility for onshore production
 * (40 CFR 98.238): all equipment under common ownership within a single
 * AAPG geologic province. Well pads roll up into it.
 */
export interface ReportBasin {
  code: string
  name: string
  /** OVERRIDE | DERIVED_FROM_COUNTY | UNRESOLVED */
  source: string
  facilities: ReportFacility[]
  totals: { ch4Mt: number; co2eMt: number; recordCount: number }
  /** Whether this basin crosses the 25,000 mt CO2e reporting threshold. */
  aboveThreshold: boolean
}

export interface ReportData {
  report: {
    id: string
    reportType: string
    reportingYear: number
    basinCode: string | null
    periodStart: Date
    periodEnd: Date
    generatedAt: Date
  }
  org: { name: string; epaReporterCode: string | null }
  basins: ReportBasin[]
  /** Flat facility list, preserved for the existing PDF builder. */
  facilities: ReportFacility[]
  grandTotals: { ch4Mt: number; co2eMt: number; recordCount: number }
}

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private basins: BasinsService,
  ) {}

  async list(orgId: string, year?: number) {
    return this.prisma.asOrg(orgId, tx =>
      tx.complianceReport.findMany({
        where: { orgId, ...(year ? { reportingYear: year } : {}) },
        orderBy: [{ reportingYear: 'desc' }, { createdAt: 'desc' }],
        include: { facility: { select: { id: true, name: true } } },
      }),
    )
  }

  async findById(id: string, orgId: string) {
    const report = await this.prisma.asOrg(orgId, tx =>
      tx.complianceReport.findFirst({
        where: { id, orgId },
        include: { facility: true },
      }),
    )
    if (!report) throw new NotFoundException('Report not found')
    return report
  }

  async generate(orgId: string, input: GenerateReportInput) {
    const periodStart = new Date(Date.UTC(input.reportingYear, 0, 1))
    const periodEnd = new Date(Date.UTC(input.reportingYear + 1, 0, 1))

    return this.prisma.asOrg(orgId, async tx => {
      if (input.facilityId) {
        const facility = await tx.facility.findFirst({
          where: { id: input.facilityId, orgId },
          select: { id: true },
        })
        if (!facility) throw new NotFoundException('Facility not found')
      }

      const recordCount = await tx.emissionRecord.count({
        where: {
          ...(input.facilityId ? { facilityId: input.facilityId } : {}),
          facility: { orgId },
          reportingPeriodStart: { gte: periodStart },
          reportingPeriodEnd: { lte: periodEnd },
        },
      })
      if (recordCount === 0) {
        throw new BadRequestException(
          `No persisted emission records found for ${input.reportingYear}. ` +
            `Run POST /emissions/calculate with persist: true first.`,
        )
      }

      return tx.complianceReport.create({
        data: {
          orgId,
          facilityId: input.facilityId ?? null,
          basinCode: input.basinCode ?? null,
          reportType: input.reportType,
          reportingYear: input.reportingYear,
          periodStart,
          periodEnd,
          status: 'DRAFT',
          generatedAt: new Date(),
        },
      })
    })
  }

  /**
   * Assemble report data, grouped by basin. Basin is resolved per
   * facility: explicit override first, else derived from state+county.
   * Facilities whose basin cannot be determined land in an UNRESOLVED
   * bucket rather than being silently folded into another basin.
   */
  async buildReportData(reportId: string, orgId: string): Promise<ReportData> {
    const report = await this.prisma.asOrg(orgId, tx =>
      tx.complianceReport.findFirst({ where: { id: reportId, orgId } }),
    )
    if (!report) throw new NotFoundException('Report not found')

    const org = await this.prisma.asOrg(orgId, tx =>
      tx.organization.findFirst({
        where: { id: orgId },
        select: { name: true, epaReporterCode: true },
      }),
    )

    const facilityRows = await this.prisma.asOrg(orgId, tx =>
      tx.facility.findMany({
        where: { orgId, ...(report.facilityId ? { id: report.facilityId } : {}) },
        select: {
          id: true,
          name: true,
          apiWellNumber: true,
          state: true,
          county: true,
          basinCode: true,
        },
        orderBy: { name: 'asc' },
      }),
    )

    const byBasin = new Map<string, ReportBasin>()
    const flat: ReportFacility[] = []
    let grandCh4 = 0
    let grandCo2e = 0
    let grandCount = 0

    for (const f of facilityRows) {
      const basin = await this.basins.resolveForFacility(f)

      // Basin-scoped report: skip facilities outside the selected basin.
      if (report.basinCode && basin.code !== report.basinCode) continue

      const records = await this.prisma.asOrg(orgId, tx =>
        tx.emissionRecord.findMany({
          where: {
            facilityId: f.id,
            reportingPeriodStart: { gte: report.periodStart },
            reportingPeriodEnd: { lte: report.periodEnd },
          },
          include: {
            equipment: { select: { tag: true } },
            emissionFactor: { select: { federalRegCitation: true, source: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
      )
      if (records.length === 0 && report.facilityId == null) continue

      let ch4 = 0
      let co2e = 0
      const mapped: ReportRecord[] = records.map(r => {
        const activity = (r.activityData ?? {}) as Record<string, any>
        const assumptions: string[] = []
        if (activity.assumedComposition)
          assumptions.push('CH4 mole fraction is a platform default — facility gas analysis not on file')
        if (activity.assumedServiceType)
          assumptions.push('Gas service assumed — facility service type not on file')
        if (activity.isCountEstimated) assumptions.push('Device count estimated')

        const qtyMt = this.toMt(Number(r.calculatedQuantity), r.unit)
        const rowCo2e = Number(r.co2Equivalent ?? 0)
        if (r.pollutant === 'CH4') ch4 += qtyMt
        co2e += rowCo2e
        return {
          equipmentTag: r.equipment?.tag ?? null,
          calculationMethod: r.calculationMethod,
          pollutant: r.pollutant,
          quantityMt: qtyMt,
          co2eMt: rowCo2e,
          citation: r.emissionFactor?.federalRegCitation ?? null,
          factorSource: r.emissionFactor?.source ?? null,
          assumptions,
          notes: r.notes,
        }
      })

      const rf: ReportFacility = {
        id: f.id,
        name: f.name,
        apiWellNumber: f.apiWellNumber,
        state: f.state,
        county: f.county,
        records: mapped,
        totals: { ch4Mt: ch4, co2eMt: co2e },
      }
      flat.push(rf)

      const key = basin.code
      if (!byBasin.has(key)) {
        byBasin.set(key, {
          code: basin.code,
          name: basin.name,
          source: basin.source,
          facilities: [],
          totals: { ch4Mt: 0, co2eMt: 0, recordCount: 0 },
          aboveThreshold: false,
        })
      }
      const b = byBasin.get(key)!
      b.facilities.push(rf)
      b.totals.ch4Mt += ch4
      b.totals.co2eMt += co2e
      b.totals.recordCount += records.length

      grandCh4 += ch4
      grandCo2e += co2e
      grandCount += records.length
    }

    const basins = [...byBasin.values()].map(b => ({
      ...b,
      aboveThreshold: b.totals.co2eMt >= SUBPART_W_THRESHOLD_MT_CO2E,
    }))
    basins.sort((a, b) => b.totals.co2eMt - a.totals.co2eMt)

    return {
      report: {
        id: report.id,
        reportType: report.reportType,
        reportingYear: report.reportingYear,
        basinCode: report.basinCode,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        generatedAt: report.generatedAt ?? new Date(),
      },
      org: org ?? { name: 'Unknown Organization', epaReporterCode: null },
      basins,
      facilities: flat,
      grandTotals: { ch4Mt: grandCh4, co2eMt: grandCo2e, recordCount: grandCount },
    }
  }

  private toMt(quantity: number, unit: string): number {
    switch (unit) {
      case 'kg':
        return quantity / 1000
      case 'mt':
      case 'mt-CO2e':
        return quantity
      default:
        return quantity / 1000
    }
  }
}
