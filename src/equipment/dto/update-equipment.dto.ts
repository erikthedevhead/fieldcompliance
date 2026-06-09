import { IsString, IsOptional, IsInt, IsNumber, IsIn, IsDateString, MaxLength } from 'class-validator'

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  model?: string

  @IsOptional()
  @IsString()
  serialNumber?: string

  @IsOptional()
  @IsDateString()
  lastServiceDate?: string

  @IsOptional()
  @IsIn(['high-bleed', 'low-bleed', 'instrument'])
  pneumaticType?: string

  @IsOptional()
  @IsNumber()
  tankCapacityBbls?: number

  @IsOptional()
  @IsInt()
  compressorHp?: number

  @IsOptional()
  @IsNumber()
  throughputMcfd?: number
}
