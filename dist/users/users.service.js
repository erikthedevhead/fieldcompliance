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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id, orgId) {
        const user = await this.prisma.user.findFirst({
            where: { id, orgId },
            select: this.publicSelect(),
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async listForOrg(orgId) {
        return this.prisma.user.findMany({
            where: { orgId },
            select: this.publicSelect(),
            orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
        });
    }
    async create(orgId, dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (existing)
            throw new common_1.ConflictException('Email already in use');
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
        });
    }
    async update(id, orgId, dto) {
        const user = await this.prisma.user.findFirst({ where: { id, orgId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: this.publicSelect(),
        });
    }
    async deactivate(id, orgId) {
        const user = await this.prisma.user.findFirst({ where: { id, orgId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: this.publicSelect(),
        });
    }
    publicSelect() {
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
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map