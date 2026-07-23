import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as sgMail from '@sendgrid/mail'

export interface SendMailInput {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendMailResult {
  sent: boolean
  /** Populated when sent === false, explaining why. */
  reason?: string
}

/**
 * Thin SendGrid wrapper.
 *
 * Degrades gracefully: if SENDGRID_API_KEY isn't set (local dev, or a
 * deployment where email isn't wired up yet), it logs what *would* have
 * been sent and reports sent: false rather than throwing. That keeps the
 * alert cron from crashing a deployment just because email isn't configured.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly enabled: boolean
  private readonly fromEmail: string
  private readonly fromName: string

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY')
    this.fromEmail = this.config.get<string>('EMAIL_FROM') || 'noreply@houghworks.com'
    this.fromName = this.config.get<string>('EMAIL_FROM_NAME') || 'FieldCompliance'

    this.enabled = !!apiKey
    if (this.enabled) {
      sgMail.setApiKey(apiKey!)
      this.logger.log(`Mail enabled — sending as ${this.fromName} <${this.fromEmail}>`)
    } else {
      this.logger.warn('SENDGRID_API_KEY not set — email will be logged, not sent')
    }
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    if (!this.enabled) {
      this.logger.log(
        `[DRY RUN] Would send to ${input.to}: "${input.subject}"`,
      )
      return { sent: false, reason: 'SENDGRID_API_KEY not configured' }
    }

    try {
      await sgMail.send({
        to: input.to,
        from: { email: this.fromEmail, name: this.fromName },
        subject: input.subject,
        text: input.text,
        html: input.html,
      })
      return { sent: true }
    } catch (err) {
      // SendGrid errors carry useful detail in response.body — surface it
      const detail =
        (err as any)?.response?.body?.errors
          ?.map((e: any) => e.message)
          .join('; ') ?? (err instanceof Error ? err.message : String(err))

      this.logger.error(`Failed sending to ${input.to}: ${detail}`)
      return { sent: false, reason: detail }
    }
  }
}
