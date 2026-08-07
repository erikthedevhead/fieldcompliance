import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface GenerateReportInput {
  reportType: 'SUBPART_W'
  reportingYear: number
  facilityId?: string
}

/** Assembled data handed to the PDF builder. */
export interface ReportData {
  report: {
    id: string
    reportType: string
    reportingYear: number
    periodStart: Date
    periodEnd: Date
    generatedAt: Date
  }
  org: { name: string; epaReporterCode: string | null }
  facilities: Array<{
    id: string
    name: string
    apiWellNumber: string | null
    state: string
    county: string | null
    records: Array<{
      equipmentTag: string | null
      calculationMethod: string
      pollutant: string
      quantityMt: number
      co2eMt: number
      citation: string | null
      factorSource: string | null
      assumptions: string[]
      notes: string | null
    }>
    totals: { ch4Mt: number; co2eMt: number }
  }>
  grandTotals: { ch4Mt: number; co2eMt: number; recordCount: number }
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

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

  /**
   * Create a DRAFT ComplianceReport row for the year. The PDF itself is
   * rendered on demand by GET /reports/:id/pdf from CURRENT EmissionRecord
   * data — v1 has no stored artifact, so a draft always reflects the latest
   * calculations. (Immutable stored PDFs become necessary once reports are
   * actual submission records; that is deliberately post-verification.)
   */
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

  /** Assemble everything the PDF builder needs for a report. */
  async buildReportData(reportId: string, orgId: string): Promise<ReportData> {
    return this.prisma.asOrg(orgId, async tx => {
      const report = await tx.complianceReport.findFirst({
        where: { id: reportId, orgId },
      })
      if (!report) throw new NotFoundException('Report not found')

      const org = await tx.organization.findFirst({
        where: { id: orgId },
        select: { name: true, epaReporterCode: true },
      })

      const facilities = await tx.facility.findMany({
        where: {
          orgId,
          ...(report.facilityId ? { id: report.facilityId } : {}),
        },
        select: { id: true, name: true, apiWellNumber: true, state: true, county: true },
        orderBy: { name: 'asc' },
      })

      const out: ReportData['facilities'] = []
      let grandCh4 = 0
      let grandCo2e = 0
      let grandCount = 0

      for (const f of facilities) {
        const records = await tx.emissionRecord.findMany({
          where: {
            facilityId: f.id,
            reportingPeriodStart: { gte: report.periodStart },
            reportingPeriodEnd: { lte: report.periodEnd },
          },
          include: {
            equipment: { select: { tag: true } },
            emissionFactor: {
              select: { federalRegCitation: true, source: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        })
        if (records.length === 0 && report.facilityId == null) continue

        let ch4 = 0
        let co2e = 0
        const mapped = records.map(r => {
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

        grandCh4 += ch4
        grandCo2e += co2e
        grandCount += records.length
        out.push({ ...f, records: mapped, totals: { ch4Mt: ch4, co2eMt: co2e } })
      }

      return {
        report: {
          id: report.id,
          reportType: report.reportType,
          reportingYear: report.reportingYear,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          generatedAt: report.generatedAt ?? new Date(),
        },
        org: org ?? { name: 'Unknown Organization', epaReporterCode: null },
        facilities: out,
        grandTotals: { ch4Mt: grandCh4, co2eMt: grandCo2e, recordCount: grandCount },
      }
    })
  }

  private toMt(quantity: number, unit: string): number {
    switch (unit) {
      case 'kg':
        return quantity / 1000
      case 'mt':
      case 'mt-CO2e':
        return quantity
      default:
        return quantity / 1000 // records currently persist kg
    }
  }
}
