import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService, AUCTION_QUEUE } from './jobs.service';
import { AuctionProcessor } from './processors/auction.processor';
import { AuctionsModule } from '../auctions/auctions.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
    imports: [
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
        forwardRef(() => AuctionsModule),
        forwardRef(() => WebSocketModule),
    ],
    providers: [JobsService, AuctionProcessor],
    exports: [JobsService],
})
export class JobsModule { }
