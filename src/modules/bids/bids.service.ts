import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bid } from '../../entities';

@Injectable()
export class BidsService {
    constructor(
        @InjectRepository(Bid)
        private bidRepository: Repository<Bid>,
    ) { }

    async findByAuctionId(auctionId: string, limit = 20): Promise<Bid[]> {
        return this.bidRepository.find({
            where: { auctionItemId: auctionId },
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['bidder'],
        });
    }

    async findByUserId(userId: string): Promise<Bid[]> {
        return this.bidRepository.find({
            where: { bidderId: userId },
            order: { createdAt: 'DESC' },
            relations: ['auctionItem'],
        });
    }

    async getHighestBid(auctionId: string): Promise<Bid | null> {
        return this.bidRepository.findOne({
            where: { auctionItemId: auctionId },
            order: { amount: 'DESC' },
            relations: ['bidder'],
        });
    }
}
