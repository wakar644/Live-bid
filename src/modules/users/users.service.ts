import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { User, AuctionItem, AuctionStatus, Bid } from '../../entities';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(AuctionItem)
        private auctionRepository: Repository<AuctionItem>,
        @InjectRepository(Bid)
        private bidRepository: Repository<Bid>,
        private dataSource: DataSource,
    ) { }

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            return null;
        }

        const wonAuctions = await this.auctionRepository.find({
            where: { winnerId: userId, status: AuctionStatus.SOLD },
            order: { createdAt: 'DESC' },
            take: 10,
        });

        const bidCount = await this.bidRepository.count({
            where: { bidderId: userId },
        });

        return {
            id: user.id,
            email: user.email,
            balance: user.balance,
            createdAt: user.createdAt,
            bidCount,
            wonAuctions: wonAuctions.map((a) => ({
                id: a.id,
                title: a.title,
                currentPrice: a.currentPrice,
                endsAt: a.endsAt,
            })),
        };
    }

    async getMyAuctions(userId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [auctions, total] = await this.auctionRepository.findAndCount({
            where: { creatorId: userId },
            relations: ['creator', 'winner'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        // Add bid count using a separate query
        const items = await Promise.all(
            auctions.map(async (auction) => {
                const bidCount = await this.bidRepository.count({
                    where: { auctionItemId: auction.id },
                });

                return {
                    id: auction.id,
                    title: auction.title,
                    description: auction.description,
                    startingPrice: auction.startingPrice,
                    currentPrice: auction.currentPrice,
                    createdAt: auction.createdAt,
                    endsAt: auction.endsAt,
                    status: auction.status,
                    sellerId: auction.creatorId,
                    highestBidderId: auction.winnerId,
                    creator: {
                        id: auction.creator.id,
                        email: auction.creator.email,
                    },
                    bidCount,
                };
            }),
        );

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getMyBids(userId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [bids, total] = await this.bidRepository.findAndCount({
            where: { bidderId: userId },
            relations: ['auctionItem'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        const items = bids.map((bid) => ({
            id: bid.id,
            amount: bid.amount,
            createdAt: bid.createdAt,
            auction: {
                id: bid.auctionItem.id,
                title: bid.auctionItem.title,
                status: bid.auctionItem.status,
                currentPrice: bid.auctionItem.currentPrice,
            },
        }));

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(userId: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async updateBalance(userId: string, newBalance: string): Promise<void> {
        await this.userRepository.update(userId, { balance: newBalance });
    }

    async addFunds(userId: string, amount: number): Promise<{ balance: string }> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const currentBalance = new Decimal(user.balance);
            const newBalance = currentBalance.plus(amount).toFixed(2);

            await manager.update(User, userId, { balance: newBalance });

            return { balance: newBalance };
        });
    }
}
