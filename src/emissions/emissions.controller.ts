import { Controller, Get, Query } from '@nestjs/common'
import { EmissionsService } from './emissions.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@Controller('emissions')
export class EmissionsController {
  constructor(private emissions: EmissionsService) {}

  /** List emission records for the org, optionally filtered. */
  @Get()
  list(
    @CurrentUser() user: any,
    @Query('facilityId') facilityId?: string,
    @Query('pollutant') pollutant?: string,
    @Query('year') year?: string,
  ) {
    return this.emissions.list(user.orgId, {
      facilityId,
      pollutant,
      year: year ? parseInt(year, 10) : undefined,
    })
  }

  /** Annual emission totals rollup by pollutant. */
  @Get('summary')
  summary(@CurrentUser() user: any, @Query('year') year?: string) {
    return this.emissions.summaryByPollutant(user.orgId, year ? parseInt(year, 10) : new Date().getFullYear())
  }
}
