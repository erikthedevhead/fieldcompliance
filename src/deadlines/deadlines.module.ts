import { Module } from '@nestjs/common'
import { DeadlinesController } from './deadlines.controller'
import { DeadlinesService } from './deadlines.service'
import { DeadlineGeneratorService } from './deadline-generator.service'

@Module({
  controllers: [DeadlinesController],
  providers: [DeadlinesService, DeadlineGeneratorService],
  exports: [DeadlinesService, DeadlineGeneratorService],
})
export class DeadlinesModule {}
