import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFacilityDto } from './dto/create-facility.dto'
import { UpdateFacilityDto } from './dto/update-facility.dto'

@Injectable()
export class FacilitiesService {
  constructor(private prisma: PrismaService) {}

  async listForOrg(orgId: string, opts: { activeOnly: boolean } = { activeOnly: true }) {
    return this.prisma.facility.findMany({
      where: { orgId, ...(opts.activeOnly ? { isActive: true } : {}) },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { equipment: true, deadlines: true, inspections: true } },
      },
    })
  }

  async findById(id: string, orgId: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id, orgId },
      include: {
        equipment: { where: { isActive: true } },
        _count: { select: { deadlines: true, inspections: true, emissionRecords: true } },
      },
    })
    if (!facility) throw new NotFoundException('Facility not found')
    return facility
  }

  async create(orgId: string, dto: CreateFacilityDto) {
    // Enforce facility cap per the org's plan tier
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { maxFacilities: true, _count: { select: { facilities: { where: { isActive: true } } } } },
    })
    if (!org) throw new NotFoundException('Organization not found')
    if (org._count.facilities >= org.maxFacilities) {
      throw new BadRequestException(
        `Plan limit reached (${org.maxFacilities} facilities). Upgrade your plan to add more.`,
      )
    }

    return this.prisma.facility.create({ data: { ...dto, orgId } })
  }

  async update(id: string, orgId: string, dto: UpdateFacilityDto) {
    const facility = await this.prisma.facility.findFirst({ where: { id, orgId } })
    if (!facility) throw new NotFoundException('Facility not found')

    return this.prisma.facility.update({ where: { id }, data: dto })
  }

  async decommission(id: string, orgId: string) {
    const facility = await this.prisma.facility.findFirst({ where: { id, orgId } })
    if (!facility) throw new NotFoundException('Facility not found')

    return this.prisma.facility.update({
      where: { id },
      data: { isActive: false, decommissionedAt: new Date() },
    })
  }
}
