import { IsEmail, IsString, IsIn, IsOptional, MinLength, MaxLength } from 'class-validator'

const ROLES = ['ORG_ADMIN', 'EHS_COORDINATOR', 'SITE_MANAGER', 'FIELD_TECH', 'AUDITOR'] as const

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string

  @IsIn(ROLES)
  role: (typeof ROLES)[number]

  @IsOptional()
  @IsString()
  phone?: string
}
