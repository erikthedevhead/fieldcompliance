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
exports.EquipmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EquipmentService = class EquipmentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(orgId, opts = {}) {
        return this.prisma.equipment.findMany({
            where: {
                isActive: true,
                facility: { orgId },
                ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
            },
            orderBy: [{ category: 'asc' }, { tag: 'asc' }],
            include: { facility: { select: { id: true, name: true, state: true } } },
        });
    }
    async findById(id, orgId) {
        const equipment = await this.prisma.equipment.findFirst({
            where: { id, facility: { orgId } },
            include: { facility: { select: { id: true, name: true, state: true } } },
        });
        if (!equipment)
            throw new common_1.NotFoundException('Equipment not found');
        return equipment;
    }
    async create(orgId, dto) {
        const facility = await this.prisma.facility.findFirst({
            where: { id: dto.facilityId, orgId },
        });
        if (!facility)
            throw new common_1.ForbiddenException('Facility does not belong to your organization');
        return this.prisma.equipment.create({ data: dto });
    }
    async update(id, orgId, dto) {
        const equipment = await this.prisma.equipment.findFirst({
            where: { id, facility: { orgId } },
        });
        if (!equipment)
            throw new common_1.NotFoundException('Equipment not found');
        return this.prisma.equipment.update({ where: { id }, data: dto });
    }
    async remove(id, orgId) {
        const equipment = await this.prisma.equipment.findFirst({
            where: { id, facility: { orgId } },
        });
        if (!equipment)
            throw new common_1.NotFoundException('Equipment not found');
        return this.prisma.equipment.update({
            where: { id },
            data: { isActive: false },
        });
    }
};
exports.EquipmentService = EquipmentService;
exports.EquipmentService = EquipmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EquipmentService);
//# sourceMappingURL=equipment.service.js.map