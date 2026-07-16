import { IsString, IsDateString, IsOptional, ValidateNested, IsNumber, Min, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'

class ActivityDataDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  pneumaticHours?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  compressorHours?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  dehydratorHours?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  storageTankThroughputBbl?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  fugitiveComponentCount?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  wellCompletions?: number
}

export class CalculateEmissionsDto {
  @IsString()
  facilityId: string

  @IsDateString()
  periodStart: string

  @IsDateString()
  periodEnd: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivityDataDto)
  activityData?: ActivityDataDto

  /**
   * If true, the calculation is persisted as EmissionRecord rows.
   * If false (default), results are returned without writing — useful for
   * "what-if" estimates and dashboard previews.
   */
  @IsOptional()
  @IsBoolean()
  persist?: boolean
}
