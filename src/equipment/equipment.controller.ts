import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { EquipmentService } from './equipment.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateEquipmentDto } from './dto/create-equipment.dto'
import { UpdateEquipmentDto } from './dto/update-equipment.dto'

@Controller('equipment')
export class EquipmentController {
  constructor(private equipment: EquipmentService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('facilityId') facilityId?: string) {
    return this.equipment.list(user.orgId, { facilityId })
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.equipment.findById(id, user.orgId)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR', 'SITE_MANAGER')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateEquipmentDto) {
    return this.equipment.create(user.orgId, dto)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR', 'SITE_MANAGER')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipment.update(id, user.orgId, dto)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.equipment.remove(id, user.orgId)
  }
}
