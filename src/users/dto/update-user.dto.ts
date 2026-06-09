import { IsString, IsIn, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator'

const ROLES = ['ORG_ADMIN', 'EHS_COORDINATOR', 'SITE_MANAGER', 'FIELD_TECH', 'AUDITOR'] as const

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string

  @IsOptional()
  @IsIn(ROLES)
  role?: (typeof ROLES)[number]

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
