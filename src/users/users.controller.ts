import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return this.users.findById(user.id, user.orgId)
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.users.listForOrg(user.orgId)
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.users.findById(id, user.orgId)
  }

  /** Invite a user — creates an inactive account and emails an accept link. */
  @Roles('ORG_ADMIN')
  @Post()
  invite(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.users.create(user.orgId, dto, user.id)
  }

  @Roles('ORG_ADMIN')
  @Post(':id/resend-invite')
  resendInvite(@CurrentUser() user: any, @Param('id') id: string) {
    return this.users.resendInvite(id, user.orgId)
  }

  @Roles('ORG_ADMIN')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, user.orgId, dto)
  }

  @Roles('ORG_ADMIN')
  @Delete(':id')
  deactivate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.users.deactivate(id, user.orgId)
  }
}
