import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async list(orgId: string, opts: { facilityId?: string } = {}) {
    return this.prisma.equipment.findMany({
      where: {
        isActive: true,
        facility: { orgId },
        ...(opts.facilityId ? { facilityId: opts.facilityId } : {}),
      },
      orderBy: [{ category: 'asc' }, { tag: 'asc' }],
      include: { facility: { select: { id: true, name: true, state: true } } },
    })
  }

  async findById(id: string, orgId: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, facility: { orgId } },
      include: { facility: { select: { id: true, name: true, state: true } } },
    })
    if (!equipment) throw new NotFoundException('Equipment not found')
    return equipment
  }

  async create(orgId: string, dto: CreateEquipmentDto) {
    // Verify the facility belongs to this org before creating equipment under it
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, orgId },
    })
    if (!facility) throw new ForbiddenException('Facility does not belong to your organization')

    return this.prisma.equipment.create({ data: dto })
  }

  async update(id: string, orgId: string, dto: UpdateEquipmentDto) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, facility: { orgId } },
    })
    if (!equipment) throw new NotFoundException('Equipment not found')

    return this.prisma.equipment.update({ where: { id }, data: dto })
  }

  async remove(id: string, orgId: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, facility: { orgId } },
    })
    if (!equipment) throw new NotFoundException('Equipment not found')

    // Soft delete — equipment with emission history can't be hard-deleted
    return this.prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
