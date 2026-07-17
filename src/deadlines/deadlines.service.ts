import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DeadlinesService {
  constructor(private prisma: PrismaService) {}

  async list(orgId: string, opts: { status?: string; facilityId?: string } = {}) {
    return this.prisma.asOrg(orgId, tx =>
      tx.deadline.findMany({
        where: {
          facility: { orgId },
          ...(opts.status ? { status: opts.status as any } : {}),
          ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
        },
        orderBy: [{ dueDate: 'asc' }],
        include: {
          facility: { select: { id: true, name: true, state: true } },
          assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    )
  }

  /**
   * Upcoming deadlines within N days — sorted by due date.
   * This is the dashboard view that drives daily user engagement.
   */
  async upcoming(orgId: string, days: number) {
    const now = new Date()
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

    return this.prisma.asOrg(orgId, tx =>
      tx.deadline.findMany({
        where: {
          facility: { orgId },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { gte: now, lte: horizon },
        },
        orderBy: [{ dueDate: 'asc' }],
        include: {
          facility: { select: { id: true, name: true, state: true } },
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    )
  }

  /** All currently overdue deadlines. The red-alert list. */
  async overdue(orgId: string) {
    return this.prisma.asOrg(orgId, tx =>
      tx.deadline.findMany({
        where: {
          facility: { orgId },
          status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
          dueDate: { lt: new Date() },
        },
        orderBy: [{ dueDate: 'asc' }],
        include: {
          facility: { select: { id: true, name: true, state: true } },
          assignedUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    )
  }

  async findById(id: string, orgId: string) {
    const deadline = await this.prisma.asOrg(orgId, tx =>
      tx.deadline.findFirst({
        where: { id, facility: { orgId } },
        include: {
          facility: true,
          assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          regulationVersion: { include: { regulation: true } },
        },
      }),
    )
    if (!deadline) throw new NotFoundException('Deadline not found')
    return deadline
  }

  async complete(id: string, orgId: string, userId: string, notes?: string) {
    return this.prisma.asOrg(orgId, async tx => {
      const deadline = await tx.deadline.findFirst({
        where: { id, facility: { orgId } },
      })
      if (!deadline) throw new NotFoundException('Deadline not found')
      if (deadline.status === 'COMPLETED') {
        throw new BadRequestException('Deadline already completed')
      }

      return tx.deadline.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: userId,
          ...(notes ? { notes } : {}),
        },
      })
    })
  }

  async assign(id: string, orgId: string, userId: string | null) {
    return this.prisma.asOrg(orgId, async tx => {
      const deadline = await tx.deadline.findFirst({
        where: { id, facility: { orgId } },
      })
      if (!deadline) throw new NotFoundException('Deadline not found')

      if (userId) {
        // User table is RLS-scoped — this lookup naturally filters to the current org
        const assignee = await tx.user.findFirst({ where: { id: userId, orgId } })
        if (!assignee) {
          throw new BadRequestException('User does not belong to your organization')
        }
      }

      return tx.deadline.update({
        where: { id },
        data: { assignedUserId: userId },
      })
    })
  }
}
