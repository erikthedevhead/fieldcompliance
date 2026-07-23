import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('alerts')
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  /**
   * Manually trigger the alert sweep for the caller's org.
   * Useful for testing without waiting for the 7 AM cron.
   */
  @Roles('ORG_ADMIN')
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@CurrentUser() user: any) {
    const result = await this.alerts.sendAlertsForOrg(user.orgId)
    return {
      ...result,
      message:
        result.sent === 0 && result.failed === 0
          ? 'No alerts were due. Deadlines only alert once per threshold (30/7/1/0 days).'
          : `${result.sent} alert(s) sent, ${result.failed} failed.`,
    }
  }
}
