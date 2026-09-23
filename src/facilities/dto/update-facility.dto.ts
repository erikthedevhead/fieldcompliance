import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator'

/**
 * NOTE: this is a hand-maintained parallel of CreateFacilityDto. It was
 * previously missing `commissionedAt`, which the facility form sends on
 * every edit — with forbidNonWhitelisted validation that rejects the
 * whole request. Keep the two in sync, or refactor to
 * PartialType(OmitType(CreateFacilityDto, ['type', 'state'])).
 */
export class UpdateFacilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

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

  /// Optional AAPG basin override; normally derived from state + county.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  basinCode?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ch4MoleFraction?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  co2MoleFraction?: number
}
