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

// Matches EPA Subpart W's actual pneumatic device categories (Table W-2).
// Previously modeled as 'high-bleed' | 'low-bleed' | 'instrument' — the
// third value was wrong: instrument air systems don't vent natural gas
// and don't belong in this category at all. Corrected to the real 3
// EPA-recognized device types.
const PNEUMATIC_DEVICE_TYPES = [
  'CONTINUOUS_HIGH_BLEED',
  'INTERMITTENT_BLEED',
  'CONTINUOUS_LOW_BLEED',
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
  @IsIn(PNEUMATIC_DEVICE_TYPES)
  pneumaticType?: (typeof PNEUMATIC_DEVICE_TYPES)[number]

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
