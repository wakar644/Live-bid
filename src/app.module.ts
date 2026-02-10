import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE, APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import {
  databaseConfig,
  redisConfig,
  jwtConfig,
  appConfig,
} from './config';
import { DatabaseModule } from './modules/database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BidsModule } from './modules/bids/bids.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './common/guards';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          transport: config.get('app.nodeEnv') !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
          level: config.get('app.nodeEnv') !== 'production' ? 'debug' : 'info',
        },
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig, appConfig],
      envFilePath: ['.env', '.env.example'],
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    AuctionsModule,
    BidsModule,
    WebSocketModule,
    JobsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule { }
