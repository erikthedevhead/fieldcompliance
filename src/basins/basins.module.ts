import { Module } from '@nestjs/common'
import { BasinsController } from './basins.controller'
import { BasinsService } from './basins.service'

@Module({
  controllers: [BasinsController],
  providers: [BasinsService],
  exports: [BasinsService],
})
export class BasinsModule {}
