import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BidsService } from './bids.service';
import { Bid, AuctionItem, User } from '../../entities';

@Module({
    imports: [TypeOrmModule.forFeature([Bid, AuctionItem, User])],
    providers: [BidsService],
    exports: [BidsService],
})
export class BidsModule { }
