import { IsString, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator'

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
}
