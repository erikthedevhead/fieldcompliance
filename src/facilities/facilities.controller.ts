import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { FacilitiesService } from './facilities.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateFacilityDto } from './dto/create-facility.dto'
import { UpdateFacilityDto } from './dto/update-facility.dto'

@Controller('facilities')
export class FacilitiesController {
  constructor(private facilities: FacilitiesService) {}

  @Get()
  list(@CurrentUser() user: any, @Query('active') active?: string) {
    return this.facilities.listForOrg(user.orgId, { activeOnly: active !== 'false' })
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.facilities.findById(id, user.orgId)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateFacilityDto) {
    return this.facilities.create(user.orgId, dto)
  }

  @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilities.update(id, user.orgId, dto)
  }

  @Roles('ORG_ADMIN')
  @Delete(':id')
  decommission(@CurrentUser() user: any, @Param('id') id: string) {
    return this.facilities.decommission(id, user.orgId)
  }
}
