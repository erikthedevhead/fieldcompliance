"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwt;
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
            include: { org: { select: { id: true, name: true, slug: true, planTier: true } } },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const payload = {
            sub: user.id,
            email: user.email,
            orgId: user.orgId,
            role: user.role,
        };
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
        };
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const slug = this.slugify(dto.orgName);
        const slugTaken = await this.prisma.organization.findUnique({ where: { slug } });
        if (slugTaken) {
            throw new common_1.ConflictException('Organization name already taken');
        }
        const org = await this.prisma.organization.create({
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
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        role: 'ORG_ADMIN',
                    },
                },
            },
            include: { users: true },
        });
        const user = org.users[0];
        const payload = {
            sub: user.id,
            email: user.email,
            orgId: org.id,
            role: user.role,
        };
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
        };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user)
            return { success: true };
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiry = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { resetToken: token, resetTokenExpiry: expiry },
        });
        return { success: true };
    }
    async resetPassword(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: dto.token,
                resetTokenExpiry: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: null,
                resetTokenExpiry: null,
            },
        });
        return { success: true };
    }
    async verifyUser(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { org: { select: { id: true, name: true, slug: true, planTier: true, isActive: true } } },
        });
        if (!user || !user.isActive || !user.org.isActive) {
            throw new common_1.UnauthorizedException('Account is no longer active');
        }
        return user;
    }
    slugify(s) {
        return s
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map