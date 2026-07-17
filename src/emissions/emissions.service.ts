import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class EmissionsService {
  constructor(private prisma: PrismaService) {}

  async list(
    orgId: string,
    opts: { facilityId?: string; pollutant?: string; year?: number } = {},
  ) {
    const where: any = { facility: { orgId } }
    if (opts.facilityId) where.facilityId = opts.facilityId
    if (opts.pollutant) where.pollutant = opts.pollutant
    if (opts.year) {
      where.reportingPeriodStart = {
        gte: new Date(Date.UTC(opts.year, 0, 1)),
        lt: new Date(Date.UTC(opts.year + 1, 0, 1)),
      }
    }

    return this.prisma.asOrg(orgId, tx =>
      tx.emissionRecord.findMany({
        where,
        include: {
          facility: { select: { id: true, name: true, state: true } },
          equipment: { select: { id: true, tag: true, category: true } },
        },
        orderBy: { reportingPeriodStart: 'desc' },
      }),
    )
  }

  /** Totals by pollutant for a given year. Used for dashboard rollup. */
  async summaryByPollutant(orgId: string, year: number) {
    const records = await this.prisma.asOrg(orgId, tx =>
      tx.emissionRecord.groupBy({
        by: ['pollutant'],
        where: {
          facility: { orgId },
          reportingPeriodStart: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
        },
        _sum: { calculatedQuantity: true, co2Equivalent: true },
      }),
    )

    return records.map(r => ({
      pollutant: r.pollutant,
      total: r._sum.calculatedQuantity,
      co2Equivalent: r._sum.co2Equivalent,
    }))
  }
}
