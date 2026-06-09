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
exports.DeadlinesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DeadlinesService = class DeadlinesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(orgId, opts = {}) {
        return this.prisma.deadline.findMany({
            where: {
                facility: { orgId },
                ...(opts.status ? { status: opts.status } : {}),
                ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
            },
            orderBy: [{ dueDate: 'asc' }],
            include: {
                facility: { select: { id: true, name: true, state: true } },
                assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });
    }
    async upcoming(orgId, days) {
        const now = new Date();
        const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        return this.prisma.deadline.findMany({
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
        });
    }
    async overdue(orgId) {
        return this.prisma.deadline.findMany({
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
        });
    }
    async findById(id, orgId) {
        const deadline = await this.prisma.deadline.findFirst({
            where: { id, facility: { orgId } },
            include: {
                facility: true,
                assignedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
                regulationVersion: { include: { regulation: true } },
            },
        });
        if (!deadline)
            throw new common_1.NotFoundException('Deadline not found');
        return deadline;
    }
    async complete(id, orgId, userId, notes) {
        const deadline = await this.prisma.deadline.findFirst({
            where: { id, facility: { orgId } },
        });
        if (!deadline)
            throw new common_1.NotFoundException('Deadline not found');
        if (deadline.status === 'COMPLETED') {
            throw new common_1.BadRequestException('Deadline already completed');
        }
        return this.prisma.deadline.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                completedBy: userId,
                ...(notes ? { notes } : {}),
            },
        });
    }
    async assign(id, orgId, userId) {
        const deadline = await this.prisma.deadline.findFirst({
            where: { id, facility: { orgId } },
        });
        if (!deadline)
            throw new common_1.NotFoundException('Deadline not found');
        if (userId) {
            const assignee = await this.prisma.user.findFirst({ where: { id: userId, orgId } });
            if (!assignee)
                throw new common_1.BadRequestException('User does not belong to your organization');
        }
        return this.prisma.deadline.update({
            where: { id },
            data: { assignedUserId: userId },
        });
    }
};
exports.DeadlinesService = DeadlinesService;
exports.DeadlinesService = DeadlinesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeadlinesService);
//# sourceMappingURL=deadlines.service.js.map