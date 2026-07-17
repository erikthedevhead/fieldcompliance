import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { EmissionsService } from "./emissions.service";
import { CalculatorService } from "./calculator/calculator.service";
import { CalculateEmissionsDto } from "./dto/calculate-emissions.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

@Controller("emissions")
export class EmissionsController {
  constructor(
    private emissions: EmissionsService,
    private calculator: CalculatorService,
  ) {}

  /** List emission records for the org, optionally filtered. */
  @Get()
  list(
    @CurrentUser() user: any,
    @Query("facilityId") facilityId?: string,
    @Query("pollutant") pollutant?: string,
    @Query("year") year?: string,
  ) {
    return this.emissions.list(user.orgId, {
      facilityId,
      pollutant,
      year: year ? parseInt(year, 10) : undefined,
    });
  }

  /** Annual emission totals rollup by pollutant. */
  @Get("summary")
  summary(@CurrentUser() user: any, @Query("year") year?: string) {
    return this.emissions.summaryByPollutant(
      user.orgId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  /**
   * Calculate emissions for a facility over a reporting period.
   * By default, returns a preview without writing to the DB.
   * Pass `persist: true` to write EmissionRecord rows.
   */
  @Roles("ORG_ADMIN", "EHS_COORDINATOR")
  @Post("calculate")
  @HttpCode(HttpStatus.OK)
  async calculate(
    @CurrentUser() user: any,
    @Body() dto: CalculateEmissionsDto,
  ) {
    const result = await this.calculator.calculate(
      {
        facilityId: dto.facilityId,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        activityData: dto.activityData,
      },
      user.orgId,
    );

    let persisted = 0;
    if (dto.persist) {
      persisted = await this.calculator.persistResults(user.orgId, result);
    }

    return {
      ...result,
      persisted,
    };
  }
}
