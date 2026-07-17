import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, orgId: string) {
    const user = await this.prisma.asOrg(orgId, tx =>
      tx.user.findFirst({
        where: { id, orgId },
        select: this.publicSelect(),
      }),
    )
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async listForOrg(orgId: string) {
    return this.prisma.asOrg(orgId, tx =>
      tx.user.findMany({
        where: { orgId },
        select: this.publicSelect(),
        orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      }),
    )
  }

  async create(orgId: string, dto: CreateUserDto) {
    // Global email uniqueness check — must cross tenant boundary,
    // so we use asSystem for the check only.
    const existing = await this.prisma.asSystem(tx =>
      tx.user.findUnique({ where: { email: dto.email.toLowerCase() } }),
    )
    if (existing) throw new ConflictException('Email already in use')

    // TODO: send invitation email with reset token instead of password
    return this.prisma.asOrg(orgId, tx =>
      tx.user.create({
        data: {
          orgId,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          phone: dto.phone,
        },
        select: this.publicSelect(),
      }),
    )
  }

  async update(id: string, orgId: string, dto: UpdateUserDto) {
    return this.prisma.asOrg(orgId, async tx => {
      const user = await tx.user.findFirst({ where: { id, orgId } })
      if (!user) throw new NotFoundException('User not found')

      return tx.user.update({
        where: { id },
        data: dto,
        select: this.publicSelect(),
      })
    })
  }

  async deactivate(id: string, orgId: string) {
    return this.prisma.asOrg(orgId, async tx => {
      const user = await tx.user.findFirst({ where: { id, orgId } })
      if (!user) throw new NotFoundException('User not found')

      return tx.user.update({
        where: { id },
        data: { isActive: false },
        select: this.publicSelect(),
      })
    })
  }

  /** Standard select that excludes resetToken and other sensitive fields. */
  private publicSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    }
  }
}
