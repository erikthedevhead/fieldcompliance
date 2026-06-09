import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'ok'
    try {
      await this.prisma.$queryRaw`SELECT 1`
    } catch {
      dbStatus = 'down'
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database: dbStatus },
    }
  }
}
