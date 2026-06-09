import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string, orgId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId },
      select: this.publicSelect(),
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async listForOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: this.publicSelect(),
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    })
  }

  async create(orgId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (existing) throw new ConflictException('Email already in use')

    // TODO: send invitation email with reset token instead of password
    return this.prisma.user.create({
      data: {
        orgId,
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
      },
      select: this.publicSelect(),
    })
  }

  async update(id: string, orgId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, orgId } })
    if (!user) throw new NotFoundException('User not found')

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.publicSelect(),
    })
  }

  async deactivate(id: string, orgId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, orgId } })
    if (!user) throw new NotFoundException('User not found')

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: this.publicSelect(),
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
