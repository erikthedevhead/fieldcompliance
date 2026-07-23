import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { renderDeadlineAlert } from '../mail/templates/deadline-alert.template'

/**
 * Days-before-due at which an alert fires. A deadline generates at most
 * one email per threshold — crossing 7 days doesn't re-send the 30-day
 * notice.
 *
 * 0 = due today. Negative values would be "overdue" reminders, which we
 * deliberately don't send repeatedly (see runOverdueSweep below for the
 * once-only overdue notice).
 */
const ALERT_THRESHOLDS = [30, 7, 1, 0] as const

/** Marker written to DeadlineAlert.alertType, e.g. "EMAIL_7D" / "EMAIL_OVERDUE". */
function alertTypeFor(threshold: number): string {
  return threshold < 0 ? 'EMAIL_OVERDUE' : `EMAIL_${threshold}D`
}

interface PendingAlert {
  deadlineId: string
  threshold: number
  recipientEmail: string
  recipientFirstName: string
  deadlineTitle: string
  ruleCode: string
  facilityName: string
  facilityState: string
  dueDate: Date
  daysUntilDue: number
  regulationLabel?: string
  assigneeName?: string
}

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name)
  private readonly frontendUrl: string

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') || 'https://fieldcompliance-v7.vercel.app'
  }

  /**
   * Daily alert sweep. Runs at 7 AM — an hour after the deadline generator,
   * so deadlines created this morning can alert the same day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDailySweep() {
    this.logger.log('Starting daily deadline alert sweep')

    // Cross-tenant read — trusted system operation
    const orgs = await this.prisma.asSystem(tx =>
      tx.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    )

    let totalSent = 0
    let totalFailed = 0

    for (const org of orgs) {
      try {
        const { sent, failed } = await this.sendAlertsForOrg(org.id)
        totalSent += sent
        totalFailed += failed
      } catch (err) {
        this.logger.error(
          `Alert sweep failed for org ${org.name} (${org.id})`,
          err instanceof Error ? err.stack : err,
        )
      }
    }

    this.logger.log(
      `Alert sweep complete: ${totalSent} sent, ${totalFailed} failed, across ${orgs.length} orgs`,
    )
    return { orgsProcessed: orgs.length, sent: totalSent, failed: totalFailed }
  }

  /**
   * Send all due alerts for one org. Also exposed for manual triggering.
   *
   * Structured in three phases so we never hold a database transaction open
   * across an external SMTP call:
   *   1. Read (inside asOrg) — figure out what needs sending
   *   2. Send (no transaction) — hit SendGrid
   *   3. Record (inside asOrg) — write DeadlineAlert rows
   */
  async sendAlertsForOrg(orgId: string): Promise<{ sent: number; failed: number }> {
    const pending = await this.collectPendingAlerts(orgId)

    if (pending.length === 0) {
      return { sent: 0, failed: 0 }
    }

    const results: Array<{ alert: PendingAlert; sent: boolean }> = []

    for (const alert of pending) {
      const email = renderDeadlineAlert({
        recipientFirstName: alert.recipientFirstName,
        deadlineTitle: alert.deadlineTitle,
        ruleCode: alert.ruleCode,
        facilityName: alert.facilityName,
        facilityState: alert.facilityState,
        dueDate: alert.dueDate,
        daysUntilDue: alert.daysUntilDue,
        regulationLabel: alert.regulationLabel,
        assigneeName: alert.assigneeName,
        dashboardUrl: this.frontendUrl,
      })

      const result = await this.mail.send({
        to: alert.recipientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })

      results.push({ alert, sent: result.sent })
    }

    await this.recordAlerts(orgId, results)

    const sent = results.filter(r => r.sent).length
    const failed = results.length - sent
    this.logger.log(`Org ${orgId}: ${sent} alert(s) sent, ${failed} failed`)

    return { sent, failed }
  }

  // ============================================================
  // PHASE 1 — READ
  // ============================================================

  private async collectPendingAlerts(orgId: string): Promise<PendingAlert[]> {
    return this.prisma.asOrg(orgId, async tx => {
      const now = new Date()

      // Widest window we care about — 30 days ahead through today
      const horizon = new Date(now)
      horizon.setUTCDate(horizon.getUTCDate() + 31)

      const deadlines = await tx.deadline.findMany({
        where: {
          orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lte: horizon },
        },
        include: {
          facility: { select: { name: true, state: true } },
          assignedUser: {
            select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
          },
          regulationVersion: {
            include: { regulation: { select: { title: true, cfrPart: true } } },
          },
          alerts: { select: { alertType: true } },
        },
      })

      if (deadlines.length === 0) return []

      // Fallback recipients — org admins, resolved once per sweep
      const orgAdmins = await tx.user.findMany({
        where: { orgId, role: 'ORG_ADMIN', isActive: true },
        select: { email: true, firstName: true },
      })

      const pending: PendingAlert[] = []

      for (const d of deadlines) {
        const daysUntilDue = daysBetweenUtc(now, d.dueDate)
        const threshold = matchThreshold(daysUntilDue)
        if (threshold === null) continue

        // Idempotency — skip if this threshold already alerted
        const alertType = alertTypeFor(threshold)
        if (d.alerts.some(a => a.alertType === alertType)) continue

        const assigneeName = d.assignedUser
          ? `${d.assignedUser.firstName} ${d.assignedUser.lastName}`
          : undefined

        const regulationLabel =
          d.regulationVersion?.regulation?.cfrPart ??
          d.regulationVersion?.regulation?.title ??
          undefined

        // Recipient resolution: assignee if active, else all org admins
        const recipients =
          d.assignedUser && d.assignedUser.isActive
            ? [{ email: d.assignedUser.email, firstName: d.assignedUser.firstName }]
            : orgAdmins

        if (recipients.length === 0) {
          this.logger.warn(
            `Deadline ${d.id} (${d.ruleCode}) has no resolvable recipient — skipping`,
          )
          continue
        }

        for (const r of recipients) {
          pending.push({
            deadlineId: d.id,
            threshold,
            recipientEmail: r.email,
            recipientFirstName: r.firstName,
            deadlineTitle: d.title,
            ruleCode: d.ruleCode,
            facilityName: d.facility.name,
            facilityState: d.facility.state,
            dueDate: d.dueDate,
            daysUntilDue,
            regulationLabel,
            assigneeName,
          })
        }
      }

      return pending
    })
  }

  // ============================================================
  // PHASE 3 — RECORD
  // ============================================================

  private async recordAlerts(
    orgId: string,
    results: Array<{ alert: PendingAlert; sent: boolean }>,
  ): Promise<void> {
    if (results.length === 0) return

    await this.prisma.asOrg(orgId, async tx => {
      const now = new Date()
      for (const { alert, sent } of results) {
        await tx.deadlineAlert.create({
          data: {
            deadlineId: alert.deadlineId,
            alertType: alertTypeFor(alert.threshold),
            scheduledAt: now,
            // sentAt stays null on failure, so a later sweep can retry
            sentAt: sent ? now : null,
            recipient: alert.recipientEmail,
            channel: 'sendgrid',
          },
        })
      }
    })
  }
}

// ============================================================
// DATE HELPERS
// ============================================================

/**
 * Whole days from `from` to `to`, using UTC calendar days so a deadline
 * doesn't drift across the threshold boundary depending on server timezone.
 * Negative when `to` is in the past.
 */
function daysBetweenUtc(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

/**
 * Map days-until-due onto the nearest threshold at or above it, so a
 * deadline that's 5 days out fires the 7-day alert (not skipped because
 * it wasn't checked on exactly day 7 — e.g. after a weekend outage).
 *
 * Past-due deadlines map to the overdue marker (-1), which fires once.
 */
function matchThreshold(daysUntilDue: number): number | null {
  if (daysUntilDue < 0) return -1
  for (const t of [...ALERT_THRESHOLDS].sort((a, b) => a - b)) {
    if (daysUntilDue <= t) return t
  }
  return null
}
