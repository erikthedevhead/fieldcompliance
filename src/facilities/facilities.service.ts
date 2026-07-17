import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFacilityDto } from "./dto/create-facility.dto";
import { UpdateFacilityDto } from "./dto/update-facility.dto";

/**
 * Facilities service — reference implementation for RLS conversion.
 *
 * Every tenant-scoped query is wrapped in this.prisma.asOrg(orgId, tx => ...).
 * The `where: { orgId }` filters are kept as belt-and-suspenders — RLS is
 * the primary defense, the filter is the app-layer backup.
 */
@Injectable()
export class FacilitiesService {
  constructor(private prisma: PrismaService) {}

  async listForOrg(orgId: string, opts: { activeOnly?: boolean } = {}) {
    const { activeOnly = true } = opts;
    return this.prisma.asOrg(orgId, (tx) =>
      tx.facility.findMany({
        where: { orgId, ...(activeOnly ? { isActive: true } : {}) },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              equipment: { where: { isActive: true } },
              deadlines: { where: { status: { not: "COMPLETED" } } },
              inspections: true,
            },
          },
        },
      }),
    );
  }

  async findById(id: string, orgId: string) {
    const facility = await this.prisma.asOrg(orgId, (tx) =>
      tx.facility.findFirst({
        where: { id, orgId },
        include: {
          equipment: {
            where: { isActive: true },
            orderBy: { tag: "asc" },
          },
        },
      }),
    );

    if (!facility) {
      throw new NotFoundException("Facility not found");
    }

    return facility;
  }

  async create(orgId: string, dto: CreateFacilityDto) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { maxFacilities: true },
      });
      if (!org) {
        throw new ForbiddenException("Organization not found");
      }

      const currentCount = await tx.facility.count({
        where: { orgId, isActive: true },
      });
      if (currentCount >= org.maxFacilities) {
        throw new BadRequestException(
          `Plan limit reached — ${org.maxFacilities} active facilities`,
        );
      }

      return tx.facility.create({
        data: {
          ...dto,
          orgId,
          commissionedAt: dto.commissionedAt
            ? new Date(dto.commissionedAt)
            : undefined,
        },
      });
    });
  }

  async update(id: string, orgId: string, dto: UpdateFacilityDto) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({ where: { id, orgId } });
      if (!facility) {
        throw new NotFoundException("Facility not found");
      }

      return tx.facility.update({
        where: { id },
        data: dto,
      });
    });
  }

  async decommission(id: string, orgId: string) {
    return this.prisma.asOrg(orgId, async (tx) => {
      const facility = await tx.facility.findFirst({ where: { id, orgId } });
      if (!facility) {
        throw new NotFoundException("Facility not found");
      }

      return tx.facility.update({
        where: { id },
        data: { isActive: false, decommissionedAt: new Date() },
      });
    });
  }
}
