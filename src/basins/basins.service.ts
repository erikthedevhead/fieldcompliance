import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface ResolvedBasin {
  code: string
  name: string
  /** How the basin was determined, for provenance. */
  source: 'OVERRIDE' | 'DERIVED_FROM_COUNTY' | 'UNRESOLVED'
}

export const UNRESOLVED_BASIN: ResolvedBasin = {
  code: 'UNRESOLVED',
  name: 'Basin not determined',
  source: 'UNRESOLVED',
}

@Injectable()
export class BasinsService {
  constructor(private prisma: PrismaService) {}

  /** Full basin reference list (global table, not org-scoped). */
  async list() {
    return this.prisma.asSystem(tx =>
      tx.basin.findMany({ orderBy: { code: 'asc' } }),
    )
  }

  /**
   * Candidate basins for a state + county. Usually one; EPA's table
   * does contain counties that appear under more than one basin, so
   * this returns all matches rather than guessing.
   */
  async lookup(state: string, county: string) {
    if (!state || !county) return []
    return this.prisma.asSystem(tx =>
      tx.basinCounty.findMany({
        where: {
          state: state.trim().toUpperCase(),
          county: county.trim().toUpperCase(),
        },
        include: { basin: true },
      }),
    )
  }

  /**
   * Resolve a facility's basin: explicit override wins, otherwise derive
   * from county. Returns UNRESOLVED rather than guessing when the county
   * maps to more than one basin or to none — a Subpart W facility
   * boundary is not something to assume.
   */
  async resolveForFacility(f: {
    basinCode: string | null
    state: string
    county: string | null
  }): Promise<ResolvedBasin> {
    if (f.basinCode) {
      const basin = await this.prisma.asSystem(tx =>
        tx.basin.findUnique({ where: { code: f.basinCode as string } }),
      )
      return basin
        ? { code: basin.code, name: basin.name, source: 'OVERRIDE' }
        : { code: f.basinCode, name: f.basinCode, source: 'OVERRIDE' }
    }
    if (!f.county) return UNRESOLVED_BASIN
    const matches = await this.lookup(f.state, f.county)
    if (matches.length !== 1) return UNRESOLVED_BASIN
    return {
      code: matches[0].basin.code,
      name: matches[0].basin.name,
      source: 'DERIVED_FROM_COUNTY',
    }
  }
}
