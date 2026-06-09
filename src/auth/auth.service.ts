import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

export interface JwtPayload {
  sub: string         // userId
  email: string
  orgId: string
  role: string
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /**
   * Login an existing user. Returns JWT + user profile.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { org: { select: { id: true, name: true, slug: true, planTier: true } } },
    })

    // TODO: store hashed passwords on the User model (passwordHash column to be added)
    // For now this is a stub that needs a password column added to the schema.
    // Once added: const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials')
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

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
   * Register a new organization + first admin user.
   * In production, this is the signup flow — creates an org and its first ORG_ADMIN.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })
    if (existing) {
      throw new ConflictException('Email already in use')
    }

    const slug = this.slugify(dto.orgName)
    const slugTaken = await this.prisma.organization.findUnique({ where: { slug } })
    if (slugTaken) {
      throw new ConflictException('Organization name already taken')
    }

    // TODO: hash dto.password into passwordHash once schema field is added
    // const passwordHash = await bcrypt.hash(dto.password, 12)

    const org = await this.prisma.organization.create({
      data: {
        name: dto.orgName,
        slug,
        billingEmail: dto.email.toLowerCase(),
        planTier: 'starter',
        maxFacilities: 10,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
        users: {
          create: {
            email: dto.email.toLowerCase(),
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
  }

  /**
   * Request a password reset — generates a token, stores it, and (TODO) emails it via SendGrid.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    // Always return success to prevent email enumeration
    if (!user) return { success: true }

    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    // TODO: send email via SendGrid with reset link containing token
    // await this.email.sendPasswordReset(user.email, token)

    return { success: true }
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token')
    }

    // TODO: hash dto.newPassword and store on passwordHash column (schema update needed)
    // const passwordHash = await bcrypt.hash(dto.newPassword, 12)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return { success: true }
  }

  /**
   * Verify a JWT and return the user from the database.
   * Called by the JwtStrategy on every authenticated request.
   */
  async verifyUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { org: { select: { id: true, name: true, slug: true, planTier: true, isActive: true } } },
    })

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
