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
var DeadlineGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadlineGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
let DeadlineGeneratorService = DeadlineGeneratorService_1 = class DeadlineGeneratorService {
    prisma;
    logger = new common_1.Logger(DeadlineGeneratorService_1.name);
    LOOKAHEAD_DAYS = 180;
    ACTIONABLE_TYPES = ['SURVEY', 'REPORT', 'CALCULATE', 'SUBMIT'];
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runDailyGeneration() {
        this.logger.log('Starting daily deadline generation');
        const orgs = await this.prisma.organization.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
        });
        let totalCreated = 0;
        for (const org of orgs) {
            try {
                const created = await this.generateForOrg(org.id);
                totalCreated += created;
            }
            catch (err) {
                this.logger.error(`Failed for org ${org.name} (${org.id})`, err instanceof Error ? err.stack : err);
            }
        }
        this.logger.log(`Daily generation complete: ${totalCreated} deadlines created across ${orgs.length} orgs`);
        return { orgsProcessed: orgs.length, created: totalCreated };
    }
    async generateForOrg(orgId) {
        const enrollments = await this.prisma.orgRegulation.findMany({
            where: { orgId },
            include: {
                regulation: {
                    include: {
                        versions: {
                            where: {
                                effectiveDate: { lte: new Date() },
                                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                            },
                            orderBy: { effectiveDate: 'desc' },
                            take: 1,
                            include: { requirements: true },
                        },
                    },
                },
            },
        });
        const facilities = await this.prisma.facility.findMany({
            where: { orgId, isActive: true },
            include: {
                equipment: {
                    where: { isActive: true },
                    select: { category: true },
                },
            },
        });
        if (facilities.length === 0 || enrollments.length === 0) {
            return 0;
        }
        let created = 0;
        for (const enrollment of enrollments) {
            const currentVersion = enrollment.regulation.versions[0];
            if (!currentVersion)
                continue;
            for (const rule of currentVersion.requirements) {
                if (!rule.frequencyDays)
                    continue;
                if (!this.ACTIONABLE_TYPES.includes(rule.requirementType))
                    continue;
                for (const facility of facilities) {
                    if (rule.equipmentCategory) {
                        const hasMatching = facility.equipment.some(e => e.category === rule.equipmentCategory);
                        if (!hasMatching)
                            continue;
                    }
                    const next = await this.computeNextDueDate(facility.id, rule.ruleCode, rule.frequencyDays, rule.deadlineOffsetDays ?? 0, facility.commissionedAt);
                    if (!next)
                        continue;
                    const existing = await this.prisma.deadline.findFirst({
                        where: {
                            facilityId: facility.id,
                            ruleCode: rule.ruleCode,
                            status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] },
                        },
                    });
                    if (existing)
                        continue;
                    await this.prisma.deadline.create({
                        data: {
                            orgId,
                            facilityId: facility.id,
                            regulationVersionId: currentVersion.id,
                            ruleCode: rule.ruleCode,
                            title: rule.title,
                            description: rule.description,
                            dueDate: next.dueDate,
                            periodStart: next.periodStart,
                            periodEnd: next.periodEnd,
                            status: 'PENDING',
                        },
                    });
                    created++;
                }
            }
        }
        this.logger.log(`Generated ${created} deadlines for org ${orgId}`);
        return created;
    }
    async computeNextDueDate(facilityId, ruleCode, frequencyDays, deadlineOffsetDays, facilityCommissionedAt) {
        const lastCompleted = await this.prisma.deadline.findFirst({
            where: { facilityId, ruleCode, status: 'COMPLETED' },
            orderBy: { dueDate: 'desc' },
        });
        let anchor;
        if (lastCompleted) {
            anchor = lastCompleted.dueDate;
        }
        else if (facilityCommissionedAt) {
            anchor = facilityCommissionedAt;
        }
        else {
            anchor = new Date();
        }
        const dueDate = this.addDays(anchor, frequencyDays);
        let adjustedDueDate = dueDate;
        const now = new Date();
        while (adjustedDueDate < now) {
            adjustedDueDate = this.addDays(adjustedDueDate, frequencyDays);
        }
        const periodEnd = this.addDays(adjustedDueDate, -deadlineOffsetDays);
        const periodStart = this.addDays(periodEnd, -frequencyDays);
        return { dueDate: adjustedDueDate, periodStart, periodEnd };
    }
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
};
exports.DeadlineGeneratorService = DeadlineGeneratorService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_6AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeadlineGeneratorService.prototype, "runDailyGeneration", null);
exports.DeadlineGeneratorService = DeadlineGeneratorService = DeadlineGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeadlineGeneratorService);
//# sourceMappingURL=deadline-generator.service.js.map