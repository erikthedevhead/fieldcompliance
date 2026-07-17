import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

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

  // TODO: generate(orgId, type, year) — builds Subpart W / OOOOb XML payload
  // TODO: submitToEggrt(reportId) — submits via EPA e-GGRT API
  // TODO: exportPdf(reportId) — renders PDF via Puppeteer
}
