import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { invitationEmail } from '../mail/templates/invitation.template'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

const INVITE_TTL_DAYS = 7

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000'
  }

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

  /**
   * Invite a user to the org: creates an inactive, passwordless User row
   * with an invite token and emails them an acceptance link. The user
   * cannot log in until they accept (login rejects null passwordHash and
   * isActive: false independently).
   */
  async create(orgId: string, dto: CreateUserDto, invitedByUserId: string) {
    const existing = await this.prisma.asSystem(tx =>
      tx.user.findUnique({ where: { email: dto.email.toLowerCase() } }),
    )
    if (existing) throw new ConflictException('Email already in use')

    return this.prisma.asOrg(orgId, async tx => {
      const inviter = await tx.user.findFirst({
        where: { id: invitedByUserId, orgId },
        select: { firstName: true, lastName: true },
      })
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      })

      const token = randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

      const user = await tx.user.create({
        data: {
          orgId,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          phone: dto.phone,
          isActive: false,
          inviteToken: token,
          inviteTokenExpiry: expiry,
          invitedAt: new Date(),
          invitedBy: invitedByUserId,
        },
        select: this.publicSelect(),
      })

      const link = `${this.frontendUrl()}/accept-invite?token=${token}`
      await this.mail.send({
        to: dto.email.toLowerCase(),
        ...invitationEmail({
          firstName: dto.firstName,
          orgName: org?.name ?? 'FieldCompliance',
          inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}` : 'Your administrator',
          link,
          expiresDays: INVITE_TTL_DAYS,
        }),
      })

      return user
    })
  }

  /** Regenerate the token and resend the invitation email. */
  async resendInvite(id: string, orgId: string) {
    return this.prisma.asOrg(orgId, async tx => {
      const user = await tx.user.findFirst({ where: { id, orgId } })
      if (!user) throw new NotFoundException('User not found')
      if (user.passwordHash) {
        throw new BadRequestException('User has already accepted their invitation')
      }

      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      })

      const token = randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

      await tx.user.update({
        where: { id },
        data: { inviteToken: token, inviteTokenExpiry: expiry, invitedAt: new Date() },
      })

      const link = `${this.frontendUrl()}/accept-invite?token=${token}`
      await this.mail.send({
        to: user.email,
        ...invitationEmail({
          firstName: user.firstName,
          orgName: org?.name ?? 'FieldCompliance',
          inviterName: 'Your administrator',
          link,
          expiresDays: INVITE_TTL_DAYS,
        }),
      })

      return { success: true }
    })
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

  /**
   * Standard select excluding sensitive fields. UI derives status:
   * invitedAt set + isActive false => "Invited"; isActive true => "Active".
   */
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
      invitedAt: true,
    }
  }
}
