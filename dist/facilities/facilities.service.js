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
exports.FacilitiesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FacilitiesService = class FacilitiesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForOrg(orgId, opts = { activeOnly: true }) {
        return this.prisma.facility.findMany({
            where: { orgId, ...(opts.activeOnly ? { isActive: true } : {}) },
            orderBy: [{ state: 'asc' }, { name: 'asc' }],
            include: {
                _count: { select: { equipment: true, deadlines: true, inspections: true } },
            },
        });
    }
    async findById(id, orgId) {
        const facility = await this.prisma.facility.findFirst({
            where: { id, orgId },
            include: {
                equipment: { where: { isActive: true } },
                _count: { select: { deadlines: true, inspections: true, emissionRecords: true } },
            },
        });
        if (!facility)
            throw new common_1.NotFoundException('Facility not found');
        return facility;
    }
    async create(orgId, dto) {
        const org = await this.prisma.organization.findUnique({
            where: { id: orgId },
            select: { maxFacilities: true, _count: { select: { facilities: { where: { isActive: true } } } } },
        });
        if (!org)
            throw new common_1.NotFoundException('Organization not found');
        if (org._count.facilities >= org.maxFacilities) {
            throw new common_1.BadRequestException(`Plan limit reached (${org.maxFacilities} facilities). Upgrade your plan to add more.`);
        }
        return this.prisma.facility.create({ data: { ...dto, orgId } });
    }
    async update(id, orgId, dto) {
        const facility = await this.prisma.facility.findFirst({ where: { id, orgId } });
        if (!facility)
            throw new common_1.NotFoundException('Facility not found');
        return this.prisma.facility.update({ where: { id }, data: dto });
    }
    async decommission(id, orgId) {
        const facility = await this.prisma.facility.findFirst({ where: { id, orgId } });
        if (!facility)
            throw new common_1.NotFoundException('Facility not found');
        return this.prisma.facility.update({
            where: { id },
            data: { isActive: false, decommissionedAt: new Date() },
        });
    }
};
exports.FacilitiesService = FacilitiesService;
exports.FacilitiesService = FacilitiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FacilitiesService);
//# sourceMappingURL=facilities.service.js.map