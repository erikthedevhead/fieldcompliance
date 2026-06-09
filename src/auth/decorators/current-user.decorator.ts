import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Inject the authenticated user into a controller method.
 *
 * Example:
 *   @Get('me')
 *   me(@CurrentUser() user) { return user }
 *
 * The user object is populated by JwtStrategy.validate()
 * and includes the org relation.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    return data ? user?.[data] : user
  },
)
