import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule, Logger } from 'nestjs-pino';
import {
    databaseConfig,
    redisConfig,
    jwtConfig,
    appConfig,
} from './config';
import { User, AuctionItem, Bid } from './entities';
import { AUCTION_QUEUE } from './modules/jobs/jobs.service';
import { AuctionProcessor } from './modules/jobs/processors/auction.processor';
import { AuctionsService } from './modules/auctions/auctions.service';
import { AuctionGateway } from './modules/websocket/auction.gateway';
import { JobsService } from './modules/jobs/jobs.service';
import { REDIS_CLIENT } from './modules/redis/redis.module';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';

// Simplified worker module that only includes what's needed for processing jobs
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
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('database.host'),
                port: configService.get('database.port'),
                username: configService.get('database.username'),
                password: configService.get('database.password'),
                database: configService.get('database.database'),
                entities: [User, AuctionItem, Bid],
                synchronize: false,
            }),
        }),
        TypeOrmModule.forFeature([User, AuctionItem, Bid]),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    host: configService.get('redis.host'),
                    port: configService.get('redis.port'),
                },
            }),
        }),
        BullModule.registerQueue({
            name: AUCTION_QUEUE,
        }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get('jwt.expiresIn'),
                },
            }),
        }),
    ],
    providers: [
        AuctionProcessor,
        AuctionsService,
        JobsService,
        {
            provide: AuctionGateway,
            useFactory: () => {
                // Minimal gateway for worker - just provides emit methods
                return {
                    emitNewBid: () => { },
                    emitAuctionEndingSoon: () => { },
                    emitAuctionSold: () => { },
                    emitAuctionExpired: () => { },
                };
            },
        },
        {
            provide: REDIS_CLIENT,
            useFactory: (configService: ConfigService) => {
                return new Redis({
                    host: configService.get('redis.host'),
                    port: configService.get('redis.port'),
                    maxRetriesPerRequest: null,
                });
            },
            inject: [ConfigService],
        },
    ],
})
class WorkerModule { }

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(WorkerModule, {
        bufferLogs: true,
    });
    app.useLogger(app.get(Logger));

    const logger = app.get(Logger);
    logger.log('🔧 Worker process started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.log(`Received ${signal}. Gracefully shutting down...`);
        await app.close();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle process errors
    process.on('unhandledRejection', (reason, promise) => {
        console.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });

    process.on('uncaughtException', (error) => {
        console.error(`Uncaught Exception: ${error.message}`);
        process.exit(1);
    });
}

bootstrap();
