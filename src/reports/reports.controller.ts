import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { ReportsService } from './reports.service'
import { buildReportPdf } from './reports-pdf.builder'
import { GenerateReportDto } from './dto/generate-report.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('year') year?: string) {
    return this.reports.list(user.orgId, year ? parseInt(year, 10) : undefined)
  }

  /**
   * Create a DRAFT report row for a reporting year (org-wide, or a single
   * facility when facilityId is provided). Fails with 400 if no persisted
   * emission records exist for the year — run POST /emissions/calculate
   * with persist: true first.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(@CurrentUser() user: any, @Body() dto: GenerateReportDto) {
    return this.reports.generate(user.orgId, {
      reportType: 'SUBPART_W',
      reportingYear: dto.reportingYear,
      facilityId: dto.facilityId,
    })
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.reports.findById(id, user.orgId)
  }

  /**
   * Stream the draft PDF for a report. Rendered on demand from CURRENT
   * emission records, so it always reflects the latest calculations.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Get(':id/pdf')
  async pdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.reports.buildReportData(id, user.orgId)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="subpart-w-draft-${data.report.reportingYear}-${id}.pdf"`,
    )
    const doc = buildReportPdf(data)
    doc.pipe(res)
  }
}
