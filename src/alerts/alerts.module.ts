import { Module } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { MailModule } from '../mail/mail.module'

@Module({
  imports: [MailModule],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
