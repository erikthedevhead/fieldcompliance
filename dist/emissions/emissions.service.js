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
exports.EmissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EmissionsService = class EmissionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(orgId, opts = {}) {
        const where = { facility: { orgId } };
        if (opts.facilityId)
            where.facilityId = opts.facilityId;
        if (opts.pollutant)
            where.pollutant = opts.pollutant;
        if (opts.year) {
            where.reportingPeriodStart = { gte: new Date(opts.year, 0, 1) };
            where.reportingPeriodEnd = { lte: new Date(opts.year, 11, 31, 23, 59, 59) };
        }
        return this.prisma.emissionRecord.findMany({
            where,
            include: {
                facility: { select: { id: true, name: true, state: true } },
                equipment: { select: { id: true, tag: true, category: true } },
            },
            orderBy: { reportingPeriodStart: 'desc' },
        });
    }
    async summaryByPollutant(orgId, year) {
        const records = await this.prisma.emissionRecord.groupBy({
            by: ['pollutant'],
            where: {
                facility: { orgId },
                reportingPeriodStart: { gte: new Date(year, 0, 1) },
                reportingPeriodEnd: { lte: new Date(year, 11, 31, 23, 59, 59) },
            },
            _sum: { calculatedQuantity: true, co2Equivalent: true },
        });
        return records.map(r => ({
            pollutant: r.pollutant,
            total: r._sum.calculatedQuantity,
            co2Equivalent: r._sum.co2Equivalent,
        }));
    }
};
exports.EmissionsService = EmissionsService;
exports.EmissionsService = EmissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EmissionsService);
//# sourceMappingURL=emissions.service.js.map