import { Controller, Get, Query } from '@nestjs/common'
import { BasinsService } from './basins.service'

@Controller('basins')
export class BasinsController {
  constructor(private basins: BasinsService) {}

  /** Full AAPG basin reference list. */
  @Get()
  list() {
    return this.basins.list()
  }

  /** Candidate basins for a state + county, for form auto-suggest. */
  @Get('lookup')
  async lookup(@Query('state') state?: string, @Query('county') county?: string) {
    const matches = await this.basins.lookup(state ?? '', county ?? '')
    return matches.map(m => ({ code: m.basin.code, name: m.basin.name }))
  }
}
