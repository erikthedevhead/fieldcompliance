import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'

import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { Public } from './decorators/public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email)
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto)
  }
}
