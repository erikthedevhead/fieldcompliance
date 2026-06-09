import { Controller, Get, Patch, Body } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('organizations')
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  /** Get the current user's organization details. */
  @Get('me')
  getMine(@CurrentUser() user: any) {
    return this.orgs.findById(user.orgId)
  }

  /** Update org settings — admin only. */
  @Roles('ORG_ADMIN')
  @Patch('me')
  updateMine(@CurrentUser() user: any, @Body() data: { name?: string; billingEmail?: string }) {
    return this.orgs.update(user.orgId, data)
  }
}
