import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  /** Get the current logged-in user. */
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.users.findById(user.id, user.orgId)
  }

  /** List all users in the current org. Admin only. */
  @Roles('ORG_ADMIN')
  @Get()
  list(@CurrentUser() user: any) {
    return this.users.listForOrg(user.orgId)
  }

  /** Invite a new user to the org. Admin only. */
  @Roles('ORG_ADMIN')
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.users.create(user.orgId, dto)
  }

  /** Update a user in the org. Admin only. */
  @Roles('ORG_ADMIN')
  @Patch(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, user.orgId, dto)
  }

  /** Deactivate a user. Admin only. */
  @Roles('ORG_ADMIN')
  @Delete(':id')
  deactivate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.users.deactivate(id, user.orgId)
  }
}
