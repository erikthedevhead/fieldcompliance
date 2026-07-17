import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    // The id parameter IS the orgId — this is always called with the
    // authenticated user's own org id.
    const org = await this.prisma.asOrg(id, tx =>
      tx.organization.findUnique({
        where: { id },
        include: {
          _count: { select: { users: true, facilities: true } },
        },
      }),
    )
    if (!org) throw new NotFoundException('Organization not found')
    return org
  }

  /** Update billing email, name, etc. Plan tier changes go through Stripe webhook. */
  async update(id: string, data: { name?: string; billingEmail?: string }) {
    return this.prisma.asOrg(id, tx =>
      tx.organization.update({ where: { id }, data }),
    )
  }
}
