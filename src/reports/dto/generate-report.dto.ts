import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class GenerateReportDto {
  @IsInt()
  @Min(2010)
  @Max(2100)
  reportingYear: number

  /** Omit for an org-wide report covering all facilities. */
  @IsOptional()
  @IsString()
  facilityId?: string
}
