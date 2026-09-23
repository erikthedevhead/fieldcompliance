import {
  IsString,
  IsIn,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
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

// Matches EPA Subpart W's actual pneumatic device categories.
const PNEUMATIC_DEVICE_TYPES = [
  'CONTINUOUS_HIGH_BLEED',
  'INTERMITTENT_BLEED',
  'CONTINUOUS_LOW_BLEED',
] as const

const LIQUID_TYPES = ['CRUDE_OIL', 'GAS_CONDENSATE'] as const

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

  // ---- Compressor rod packing, Eq. W-29E (§98.233(p)(10)) ----

  /** Hours in OPERATING MODE during the reporting year. */
  @IsOptional()
  @IsInt()
  @Min(0)
  operatingHours?: number

  /** False when rod packing routes to a flare, combustion, or VRU. */
  @IsOptional()
  @IsBoolean()
  ventedToAtmosphere?: boolean

  /** True when subject to §60.5385b — measurement is then mandatory. */
  @IsOptional()
  @IsBoolean()
  isSubjectToOOOObCompressorStandards?: boolean

  // ---- Storage tank Method 3, Eq. W-15A / W-15B (§98.233(j)(3)) ----
  // These live on the FEEDING unit (separator / well / non-separator
  // equipment), not on the tank: W-15A counts feeding units.

  @IsOptional()
  @IsIn(LIQUID_TYPES)
  liquidType?: (typeof LIQUID_TYPES)[number]

  /** Annual average daily throughput, bbl/day. Method 3 needs >0 and <10. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyThroughputBbl?: number

  @IsOptional()
  @IsBoolean()
  feedsAtmosphericTank?: boolean

  /** Annual produced water routed to atmospheric tanks, bbl (W-15B FR). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  producedWaterBblPerYear?: number

  /** Representative feeding pressure, psig. Selects the W-15B tier. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  feedPressurePsig?: number

  /** STORAGE_TANK: emissions routed to a VRU or flare (§98.233(j)(4)). */
  @IsOptional()
  @IsBoolean()
  routesToVruOrFlare?: boolean
}
