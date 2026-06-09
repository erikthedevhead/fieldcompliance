import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  })

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3001)
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000')

  app.setGlobalPrefix('api/v1')
  app.use(helmet())
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  await app.listen(port)
  Logger.log(`🚀 FieldCompliance API running on http://localhost:${port}/api/v1`, 'Bootstrap')
}

bootstrap()
