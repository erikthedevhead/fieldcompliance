import {
  IsString,
  IsIn,
  IsOptional,
  IsNumber,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator'

const FACILITY_TYPES = [
  'PRODUCTION_WELL',
  'INJECTION_WELL',
  'COMPRESSOR_STATION',
  'GATHERING_PIPELINE',
  'PROCESSING_PLANT',
  'STORAGE_TANK_BATTERY',
  'MIDSTREAM_FACILITY',
] as const

export class CreateFacilityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @IsIn(FACILITY_TYPES)
  type: (typeof FACILITY_TYPES)[number]

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  state: string

  @IsOptional()
  @IsString()
  apiWellNumber?: string

  @IsOptional()
  @IsString()
  county?: string

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsString()
  legalDescription?: string

  @IsOptional()
  @IsDateString()
  commissionedAt?: string
}
