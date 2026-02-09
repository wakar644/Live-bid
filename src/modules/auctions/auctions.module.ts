import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsService } from './auctions.service';
import { AuctionsController } from './auctions.controller';
import { AuctionItem, Bid, User } from '../../entities';
import { WebSocketModule } from '../websocket/websocket.module';
import { JobsModule } from '../jobs/jobs.module';
import { BidsModule } from '../bids/bids.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuctionItem, Bid, User]),
        forwardRef(() => WebSocketModule),
        forwardRef(() => JobsModule),
        BidsModule,
    ],
    controllers: [AuctionsController],
    providers: [AuctionsService],
    exports: [AuctionsService],
})
export class AuctionsModule { }
