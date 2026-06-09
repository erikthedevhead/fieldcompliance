import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma service wired for Prisma 7's required driver adapter pattern.
 *
 * Prisma 7 (Nov 2025) removed the built-in query engine and requires
 * an explicit driver adapter package per database. We use @prisma/adapter-pg
 * with the standard pg library.
 *
 * The connection string comes from DATABASE_URL via ConfigService so the
 * service is testable (we can inject a different config in tests).
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
}
