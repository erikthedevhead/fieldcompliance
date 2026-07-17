import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

export interface JwtPayload {
  sub: string
  email: string
  orgId: string
  role: string
}

const BCRYPT_ROUNDS = 12

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /**
   * Login. Uses asSystem because we don't know the user's org yet —
   * the whole point of login is to figure out which org they belong to.
   */
  async login(dto: LoginDto) {
    // Look up user (RLS bypass needed — org context unknown pre-auth)
    const user = await this.prisma.asSystem(tx =>
      tx.user.findUnique({
        where: { email: dto.email.toLowerCase() },
        include: { org: { select: { id: true, name: true, slug: true, planTier: true } } },
      }),
    )

    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Now that we know the org, use asOrg for the lastLoginAt update
    await this.prisma.asOrg(user.orgId, tx =>
      tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    )

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    }

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        org: user.org,
      },
    }
  }

  /**
   * Register a new org + admin. Whole flow is asSystem — creating a new
   * org means there is no existing org context to work within.
   */
  async register(dto: RegisterDto) {
    return this.prisma.asSystem(async tx => {
      const existing = await tx.user.findUnique({ where: { email: dto.email.toLowerCase() } })
      if (existing) {
        throw new ConflictException('Email already in use')
      }

      const slug = this.slugify(dto.orgName)
      const slugTaken = await tx.organization.findUnique({ where: { slug } })
      if (slugTaken) {
        throw new ConflictException('Organization name already taken')
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)

      const org = await tx.organization.create({
        data: {
          name: dto.orgName,
          slug,
          billingEmail: dto.email.toLowerCase(),
          planTier: 'starter',
          maxFacilities: 10,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          users: {
            create: {
              email: dto.email.toLowerCase(),
              passwordHash,
              firstName: dto.firstName,
              lastName: dto.lastName,
              role: 'ORG_ADMIN',
            },
          },
        },
        include: { users: true },
      })

      const user = org.users[0]
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        orgId: org.id,
        role: user.role,
      }

      return {
        accessToken: this.jwt.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          org: { id: org.id, name: org.name, slug: org.slug, planTier: org.planTier },
        },
      }
    })
  }

  /**
   * Password reset request — asSystem because we look up by email without
   * knowing the org.
   */
  async requestPasswordReset(email: string) {
    return this.prisma.asSystem(async tx => {
      const user = await tx.user.findUnique({ where: { email: email.toLowerCase() } })
      // Always return success to prevent email enumeration
      if (!user) return { success: true }

      const token = randomBytes(32).toString('hex')
      const expiry = new Date(Date.now() + 60 * 60 * 1000)

      await tx.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })

      // TODO: send email via SendGrid

      return { success: true }
    })
  }

  /**
   * Reset password using a token. asSystem — the token itself is the
   * authentication factor here; we don't have org context yet.
   */
  async resetPassword(dto: ResetPasswordDto) {
    return this.prisma.asSystem(async tx => {
      const user = await tx.user.findFirst({
        where: {
          resetToken: dto.token,
          resetTokenExpiry: { gt: new Date() },
        },
      })

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token')
      }

      const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS)

      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      })

      return { success: true }
    })
  }

  /**
   * Verify a JWT — called on every authenticated request via JwtStrategy.
   * We already know orgId from the JWT payload, so use asOrg.
   */
  async verifyUser(payload: JwtPayload) {
    const user = await this.prisma.asOrg(payload.orgId, tx =>
      tx.user.findUnique({
        where: { id: payload.sub },
        include: {
          org: { select: { id: true, name: true, slug: true, planTier: true, isActive: true } },
        },
      }),
    )

    if (!user || !user.isActive || !user.org.isActive) {
      throw new UnauthorizedException('Account is no longer active')
    }

    return user
  }

  private slugify(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
  }
}
