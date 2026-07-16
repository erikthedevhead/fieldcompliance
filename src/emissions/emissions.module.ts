import { Module } from '@nestjs/common'
import { EmissionsController } from './emissions.controller'
import { EmissionsService } from './emissions.service'
import { CalculatorService } from './calculator/calculator.service'

@Module({
  controllers: [EmissionsController],
  providers: [EmissionsService, CalculatorService],
  exports: [EmissionsService, CalculatorService],
})
export class EmissionsModule {}
