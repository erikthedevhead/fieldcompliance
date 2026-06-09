import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

/**
 * Mark a route as requiring one of the specified roles.
 *
 * Example:
 *   @Roles('ORG_ADMIN', 'EHS_COORDINATOR')
 *   @Post()
 *   create(...) {}
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles)
