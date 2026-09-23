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
import { buildReportWorkbook } from './reports-excel.builder'
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
   * Create a DRAFT report row for a reporting year. Scope with facilityId
   * (one well pad) or basinCode (EPA's actual reporting-facility
   * boundary for onshore production). Fails with 400 if no persisted
   * emission records exist for the year.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generate(@CurrentUser() user: any, @Body() dto: GenerateReportDto) {
    return this.reports.generate(user.orgId, {
      reportType: 'SUBPART_W',
      reportingYear: dto.reportingYear,
      facilityId: dto.facilityId,
      basinCode: dto.basinCode,
    })
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.reports.findById(id, user.orgId)
  }

  /** Draft PDF, rendered on demand from current emission records. */
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

  /**
   * Basin-aggregated Excel workbook of supporting data. Not the official
   * EPA reporting form — see the Assumptions & Limitations sheet.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Get(':id/xlsx')
  async xlsx(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.reports.buildReportData(id, user.orgId)
    const wb = await buildReportWorkbook(data)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="subpart-w-supporting-${data.report.reportingYear}-${id}.xlsx"`,
    )
    await wb.xlsx.write(res)
    res.end()
  }
}
