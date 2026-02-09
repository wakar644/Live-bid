import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, AuctionItem, AuctionStatus } from '../../entities';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(AuctionItem)
        private auctionRepository: Repository<AuctionItem>,
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

        return {
            id: user.id,
            email: user.email,
            balance: user.balance,
            createdAt: user.createdAt,
            wonAuctions: wonAuctions.map((a) => ({
                id: a.id,
                title: a.title,
                currentPrice: a.currentPrice,
                endsAt: a.endsAt,
            })),
        };
    }

    async findById(userId: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async updateBalance(userId: string, newBalance: string): Promise<void> {
        await this.userRepository.update(userId, { balance: newBalance });
    }
}
