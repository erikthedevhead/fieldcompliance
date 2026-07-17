import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

/**
 * Generates upcoming Deadline rows from RegulationRule definitions.
 *
 * Runs daily at 6 AM. For every active org enrolled in a regulation, this
 * walks its facilities and the regulation's rules to compute upcoming
 * obligations and inserts new Deadline rows when needed.
 *
 * Idempotent: if an active deadline already exists for a (facility, ruleCode)
 * pair, no new one is created. Safe to re-run.
 */
@Injectable()
export class DeadlineGeneratorService {
  private readonly logger = new Logger(DeadlineGeneratorService.name)

  private readonly LOOKAHEAD_DAYS = 180
  private readonly ACTIONABLE_TYPES = ['SURVEY', 'REPORT', 'CALCULATE', 'SUBMIT']

  constructor(private prisma: PrismaService) {}

  /**
   * Daily cron — generates deadlines for every active org.
   * The org list read requires asSystem (cross-tenant), then each
   * per-org generation runs inside asOrg for RLS-scoped work.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyGeneration() {
    this.logger.log('Starting daily deadline generation')

    // Cross-tenant read — trusted system operation
    const orgs = await this.prisma.asSystem(tx =>
      tx.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    )

    let totalCreated = 0
    for (const org of orgs) {
      try {
        const created = await this.generateForOrg(org.id)
        totalCreated += created
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

  /**
   * Generate deadlines for a single org. Returns the number created.
   * Wraps all queries in asOrg so RLS enforces tenant isolation.
   */
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
          equipment: {
            where: { isActive: true },
            select: { category: true },
          },
        },
      })

      if (facilities.length === 0 || enrollments.length === 0) {
        return 0
      }

      let created = 0

      for (const enrollment of enrollments) {
        const currentVersion = enrollment.regulation.versions[0]
        if (!currentVersion) continue

        for (const rule of currentVersion.requirements) {
          if (!rule.frequencyDays) continue
          if (!this.ACTIONABLE_TYPES.includes(rule.requirementType)) continue

          for (const facility of facilities) {
            if (rule.equipmentCategory) {
              const hasMatching = facility.equipment.some(
                e => e.category === rule.equipmentCategory,
              )
              if (!hasMatching) continue
            }

            const next = await this.computeNextDueDate(
              tx,
              facility.id,
              rule.ruleCode,
              rule.frequencyDays,
              rule.deadlineOffsetDays ?? 0,
              facility.commissionedAt,
            )

            if (!next) continue

            const existing = await tx.deadline.findFirst({
              where: {
                facilityId: facility.id,
                ruleCode: rule.ruleCode,
                status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
              },
            })
            if (existing) continue

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
   * Compute the next due date for a (facility, rule) combination.
   * Takes the transaction client so it runs inside the caller's asOrg scope.
   */
  private async computeNextDueDate(
    tx: Prisma.TransactionClient,
    facilityId: string,
    ruleCode: string,
    frequencyDays: number,
    deadlineOffsetDays: number,
    facilityCommissionedAt: Date | null,
  ): Promise<{ dueDate: Date; periodStart: Date; periodEnd: Date } | null> {
    const lastCompleted = await tx.deadline.findFirst({
      where: { facilityId, ruleCode, status: 'COMPLETED' },
      orderBy: { dueDate: 'desc' },
    })

    let anchor: Date
    if (lastCompleted) {
      anchor = lastCompleted.dueDate
    } else if (facilityCommissionedAt) {
      anchor = facilityCommissionedAt
    } else {
      anchor = new Date()
    }

    const dueDate = this.addDays(anchor, frequencyDays)

    // Roll forward past-due computed dates
    let adjustedDueDate = dueDate
    const now = new Date()
    while (adjustedDueDate < now) {
      adjustedDueDate = this.addDays(adjustedDueDate, frequencyDays)
    }

    const periodEnd = this.addDays(adjustedDueDate, -deadlineOffsetDays)
    const periodStart = this.addDays(periodEnd, -frequencyDays)

    return { dueDate: adjustedDueDate, periodStart, periodEnd }
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }
}
