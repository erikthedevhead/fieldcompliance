import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEquipmentDto } from "./dto/create-equipment.dto";
import { UpdateEquipmentDto } from "./dto/update-equipment.dto";

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async list(orgId: string, opts: { facilityId?: string } = {}) {
    return this.prisma.asOrg(orgId, (tx) =>
      tx.equipment.findMany({
        where: {
          isActive: true,
          facility: { orgId },
          ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
        },
        orderBy: [{ category: "asc" }, { tag: "asc" }],
        include: {
          facility: { select: { id: true, name: true, state: true } },
        },
      }),
    );
  }

  async findById(id: string, orgId: string) {
    const equipment = await this.prisma.asOrg(orgId, (tx) =>
      tx.equipment.findFirst({
        where: { id, facility: { orgId } },
        include: {
          facility: { select: { id: true, name: true, state: true } },
        },
      }),
    );
    if (!equipment) throw new NotFoundException("Equipment not found");
    return equipment;
  }

  async create(orgId: string, dto: CreateEquipmentDto) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({
        where: { id: dto.facilityId, orgId },
      });
      if (!facility) {
        throw new ForbiddenException(
          "Facility does not belong to your organization",
        );
      }
      return tx.equipment.create({
        data: {
          ...dto,
          installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        },
      });
    });
  }

  async update(id: string, orgId: string, dto: UpdateEquipmentDto) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const equipment = await tx.equipment.findFirst({
        where: { id, facility: { orgId } },
      });
      if (!equipment) throw new NotFoundException("Equipment not found");
      return tx.equipment.update({
        where: { id },
        data: {
          ...dto,
          installDate: dto.installDate ? new Date(dto.installDate) : undefined,
          lastServiceDate: dto.lastServiceDate
            ? new Date(dto.lastServiceDate)
            : undefined,
        },
      });
    });
  }

  async remove(id: string, orgId: string) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const equipment = await tx.equipment.findFirst({
        where: { id, facility: { orgId } },
      });
      if (!equipment) throw new NotFoundException("Equipment not found");
      // Soft delete — equipment with emission history can't be hard-deleted
      return tx.equipment.update({
        where: { id },
        data: { isActive: false },
      });
    });
  }
}
