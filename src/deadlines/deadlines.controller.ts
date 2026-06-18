import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { DeadlinesService } from './deadlines.service'
import { DeadlineGeneratorService } from './deadline-generator.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { CompleteDeadlineDto } from './dto/complete-deadline.dto'

@Controller('deadlines')
export class DeadlinesController {
  constructor(
    private deadlines: DeadlinesService,
    private generator: DeadlineGeneratorService,
  ) {}

  /** Upcoming deadlines for the org, optionally filtered by status or facility. */
  @Get()
  list(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.deadlines.list(user.orgId, { status, facilityId })
  }

  /** The dashboard "next 30 days" priority view. */
  @Get('upcoming')
  upcoming(@CurrentUser() user: any, @Query('days') days = '30') {
    return this.deadlines.upcoming(user.orgId, parseInt(days, 10))
  }

  /** Overdue deadlines — the red-alert list. */
  @Get('overdue')
  overdue(@CurrentUser() user: any) {
    return this.deadlines.overdue(user.orgId)
  }

  /**
   * Manually trigger the deadline generator for the current org.
   * The daily cron handles this automatically; this is for testing
   * and for first-run after enrolling in a new regulation.
   */
  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@CurrentUser() user: any) {
    const created = await this.generator.generateForOrg(user.orgId)
    return { created, message: `Generated ${created} new deadlines` }
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deadlines.findById(id, user.orgId)
  }

  /** Mark a deadline complete with optional notes. */
  @Patch(':id/complete')
  complete(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CompleteDeadlineDto) {
    return this.deadlines.complete(id, user.orgId, user.id, dto.notes)
  }

  /** Assign a deadline to a user. */
  @Patch(':id/assign')
  assign(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { userId: string | null },
  ) {
    return this.deadlines.assign(id, user.orgId, body.userId)
  }
}
