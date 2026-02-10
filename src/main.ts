import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Graceful shutdown
  app.enableShutdownHooks();

  const logger = app.get(Logger);

  await app.listen(port, "0.0.0.0");
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
}

// Handle unhandled rejections and uncaught exceptions with console as fallback

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  console.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

bootstrap();
