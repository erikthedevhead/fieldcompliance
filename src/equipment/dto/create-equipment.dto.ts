import {
  IsString,
  IsIn,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator'

const CATEGORIES = [
  'PNEUMATIC_CONTROLLER',
  'PNEUMATIC_PUMP',
  'STORAGE_TANK',
  'SEPARATOR',
  'COMPRESSOR_RECIPROCATING',
  'COMPRESSOR_CENTRIFUGAL',
  'DEHYDRATOR_GLYCOL',
  'METER_SEPARATOR',
  'FLARE_SYSTEM',
  'WELLHEAD',
  'FUGITIVE_COMPONENT',
] as const

export class CreateEquipmentDto {
  @IsString()
  facilityId: string

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  tag: string

  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number]

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
  installDate?: string

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
