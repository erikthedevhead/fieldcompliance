import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'
import {
  computeFixedAnnual,
  computeRollingInterval,
  type ComputedSchedule,
} from './deadline-schedule'

/**
 * Generates upcoming Deadline rows from RegulationRule definitions.
 *
 * Runs daily at 6 AM. For every active org enrolled in a regulation, this
 * walks its facilities and the regulation's rules to compute upcoming
 * obligations and inserts new Deadline rows when needed.
 *
 * Idempotent: if an active deadline already exists for a (facility, ruleCode)
 * pair, no new one is created. Safe to re-run.
 *
 * 2026-10-14 SCHEDULE TYPES: due dates previously came from a single
 * rolling-interval calculation anchored on the last completion (or on
 * facility commissioning). That is right for surveys and repair windows
 * but wrong for annual reports, which fall on a statutory calendar date
 * covering a calendar year. Rules now declare which shape they are; the
 * arithmetic itself lives in deadline-schedule.ts and is unit tested.
 */
@Injectable()
export class DeadlineGeneratorService {
  private readonly logger = new Logger(DeadlineGeneratorService.name)

  private readonly ACTIONABLE_TYPES = ['SURVEY', 'REPORT', 'CALCULATE', 'SUBMIT']

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyGeneration() {
    this.logger.log('Starting daily deadline generation')

    const orgs = await this.prisma.asSystem(tx =>
      tx.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    )

    let totalCreated = 0
    for (const org of orgs) {
      try {
        totalCreated += await this.generateForOrg(org.id)
      } catch (err) {
        this.logger.error(
          `Failed for org ${org.name} (${org.id})`,
          err instanceof Error ? err.stack : err,
        )
      }
    }

    this.logger.log(
      `Daily generation complete: ${totalCreated} deadlines created across ${orgs.length} orgs`,
    )
    return { orgsProcessed: orgs.length, created: totalCreated }
  }

  async generateForOrg(orgId: string): Promise<number> {
    return this.prisma.asOrg(orgId, async tx => {
      const enrollments = await tx.orgRegulation.findMany({
        where: { orgId },
        include: {
          regulation: {
            include: {
              versions: {
                where: {
                  effectiveDate: { lte: new Date() },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
                orderBy: { effectiveDate: 'desc' },
                take: 1,
                include: { requirements: true },
              },
            },
          },
        },
      })

      const facilities = await tx.facility.findMany({
        where: { orgId, isActive: true },
        include: {
          equipment: { where: { isActive: true }, select: { category: true } },
        },
      })

      if (facilities.length === 0 || enrollments.length === 0) return 0

      let created = 0
      const now = new Date()

      for (const enrollment of enrollments) {
        const currentVersion = enrollment.regulation.versions[0]
        if (!currentVersion) continue

        for (const rule of currentVersion.requirements) {
          if (!this.ACTIONABLE_TYPES.includes(rule.requirementType)) continue

          const isFixed = (rule as any).scheduleType === 'FIXED_ANNUAL'
          // Rolling rules need a frequency; fixed-annual rules need a date.
          if (!isFixed && !rule.frequencyDays) continue
          if (isFixed && (!(rule as any).fixedDueMonth || !(rule as any).fixedDueDay)) {
            this.logger.warn(
              `Rule ${rule.ruleCode} is FIXED_ANNUAL but has no fixedDueMonth/fixedDueDay — skipped.`,
            )
            continue
          }

          for (const facility of facilities) {
            if (rule.equipmentCategory) {
              const hasMatching = facility.equipment.some(
                e => e.category === rule.equipmentCategory,
              )
              if (!hasMatching) continue
            }

            const existing = await tx.deadline.findFirst({
              where: {
                facilityId: facility.id,
                ruleCode: rule.ruleCode,
                status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
              },
            })
            if (existing) continue

            let next: ComputedSchedule | null = null
            try {
              next = isFixed
                ? computeFixedAnnual(
                    now,
                    (rule as any).fixedDueMonth,
                    (rule as any).fixedDueDay,
                  )
                : await this.computeRolling(
                    tx,
                    facility.id,
                    rule.ruleCode,
                    rule.frequencyDays as number,
                    rule.deadlineOffsetDays ?? 0,
                    facility.commissionedAt,
                    now,
                  )
            } catch (err) {
              this.logger.error(
                `Schedule computation failed for ${rule.ruleCode} / ${facility.name}: ` +
                  (err instanceof Error ? err.message : String(err)),
              )
              continue
            }
            if (!next) continue

            await tx.deadline.create({
              data: {
                orgId,
                facilityId: facility.id,
                regulationVersionId: currentVersion.id,
                ruleCode: rule.ruleCode,
                title: rule.title,
                description: rule.description,
                dueDate: next.dueDate,
                periodStart: next.periodStart,
                periodEnd: next.periodEnd,
                status: 'PENDING',
              },
            })
            created++
          }
        }
      }

      this.logger.log(`Generated ${created} deadlines for org ${orgId}`)
      return created
    })
  }

  /**
   * Rolling obligations anchor on the last completion, falling back to
   * facility commissioning and then to today. Takes the transaction
   * client so it runs inside the caller's asOrg scope.
   */
  private async computeRolling(
    tx: Prisma.TransactionClient,
    facilityId: string,
    ruleCode: string,
    frequencyDays: number,
    deadlineOffsetDays: number,
    facilityCommissionedAt: Date | null,
    now: Date,
  ): Promise<ComputedSchedule> {
    const lastCompleted = await tx.deadline.findFirst({
      where: { facilityId, ruleCode, status: 'COMPLETED' },
      orderBy: { dueDate: 'desc' },
    })

    const anchor = lastCompleted
      ? lastCompleted.dueDate
      : (facilityCommissionedAt ?? now)

    return computeRollingInterval(now, anchor, frequencyDays, deadlineOffsetDays)
  }
}
