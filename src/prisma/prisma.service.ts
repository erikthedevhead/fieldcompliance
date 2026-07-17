import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma service with Row-Level Security helpers.
 *
 * Two safe query modes:
 *
 *   `asOrg(orgId, fn)` — tenant-scoped queries. Opens a transaction,
 *     sets `app.current_org` LOCAL to that transaction, runs the callback,
 *     commits. Postgres RLS policies use the session variable to filter
 *     rows. When the transaction ends, the setting is discarded — the
 *     connection returns to the pool clean.
 *
 *   `asSystem(fn)` — trusted bypass. Opens a transaction, sets
 *     `app.system_mode = 'on'` LOCAL, runs the callback. Policies honor
 *     this flag and allow all rows. ONLY use for auth lookups (find user
 *     by email) and seed scripts.
 *
 * Never bypass without asSystem/asOrg. Any query that runs outside those
 * wrappers will return 0 rows on tenant tables once BYPASSRLS is revoked
 * from the fc role.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL')
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    const adapter = new PrismaPg({ connectionString })
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Prisma connected')
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log('Prisma disconnected')
  }

  /**
   * Run a tenant-scoped operation. All queries inside the callback see
   * only rows belonging to the given orgId (via Postgres RLS policies).
   *
   * Usage:
   *   const facilities = await this.prisma.asOrg(user.orgId, tx =>
   *     tx.facility.findMany()
   *   )
   */
  async asOrg<T>(orgId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    if (!orgId) {
      throw new Error('asOrg called without orgId — this is always a bug')
    }
    return this.$transaction(async tx => {
      // set_config(name, value, is_local=true) is transaction-scoped and
      // safer than a raw SET LOCAL because it accepts parameterized values.
      await tx.$executeRaw`SELECT set_config('app.current_org', ${orgId}, true)`
      return fn(tx)
    })
  }

  /**
   * Run a trusted operation with RLS bypassed. Only use for:
   *   - Auth lookups (finding a user by email before we know the org)
   *   - Health checks that touch tenant tables
   *   - Seed scripts and admin migrations
   *
   * Never expose this to a user-controlled code path.
   */
  async asSystem<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('app.system_mode', 'on', true)`
      return fn(tx)
    })
  }
}
