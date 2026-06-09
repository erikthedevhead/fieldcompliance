import { Controller, Get, Param, Query } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('year') year?: string) {
    return this.reports.list(user.orgId, year ? parseInt(year, 10) : undefined)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.reports.findById(id, user.orgId)
  }
}
