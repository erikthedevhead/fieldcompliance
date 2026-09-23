import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class GenerateReportDto {
  @IsInt()
  @Min(2010)
  @Max(2100)
  reportingYear: number

  /** Omit for an org-wide report covering all facilities. */
  @IsOptional()
  @IsString()
  facilityId?: string

  /**
   * Scope the report to a single AAPG basin. This is what EPA actually
   * treats as the reporting facility for onshore production, so a
   * basin-scoped report is the one that maps to a Subpart W submission.
   */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  basinCode?: string
}
