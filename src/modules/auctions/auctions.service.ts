import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { AuctionItem, AuctionStatus, Bid, User } from '../../entities';
import { CreateAuctionDto, PlaceBidDto, ListAuctionsDto } from './dto';
import { AuctionGateway } from '../websocket/auction.gateway';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class AuctionsService {
    constructor(
        @InjectRepository(AuctionItem)
        private auctionRepository: Repository<AuctionItem>,
        @InjectRepository(Bid)
        private bidRepository: Repository<Bid>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectDataSource()
        private dataSource: DataSource,
        private configService: ConfigService,
        @Inject(forwardRef(() => AuctionGateway))
        private auctionGateway: AuctionGateway,
        private jobsService: JobsService,
    ) { }

    async create(creatorId: string, dto: CreateAuctionDto): Promise<AuctionItem> {
        const endsAt = new Date(dto.endsAt);

        if (endsAt <= new Date()) {
            throw new BadRequestException('Auction end date must be in the future');
        }

        const startingPrice = new Decimal(dto.startingPrice).toFixed(2);

        const auction = this.auctionRepository.create({
            title: dto.title,
            description: dto.description,
            startingPrice,
            currentPrice: startingPrice,
            status: AuctionStatus.ACTIVE,
            creatorId,
            endsAt,
        });

        const savedAuction = await this.auctionRepository.save(auction);

        // Schedule auction settlement job
        await this.jobsService.scheduleAuctionSettlement(savedAuction.id, endsAt);

        // Schedule ending soon reminder (5 minutes before)
        const reminderTime = new Date(endsAt.getTime() - 5 * 60 * 1000);
        if (reminderTime > new Date()) {
            await this.jobsService.scheduleEndingReminder(savedAuction.id, reminderTime);
        }

        return savedAuction;
    }

    async findAll(query: ListAuctionsDto) {
        const { status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const queryBuilder = this.auctionRepository
            .createQueryBuilder('auction')
            .leftJoinAndSelect('auction.creator', 'creator')
            .loadRelationCountAndMap('auction.bidCount', 'auction.bids')
            .orderBy('auction.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (status) {
            queryBuilder.where('auction.status = :status', { status });
        }

        const [items, total] = await queryBuilder.getManyAndCount();

        return {
            items: items.map((item) => ({
                id: item.id,
                title: item.title,
                currentPrice: item.currentPrice,
                status: item.status,
                endsAt: item.endsAt,
                createdAt: item.createdAt,
                bidCount: (item as any).bidCount || 0,
                creator: item.creator ? { id: item.creator.id, email: item.creator.email } : null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const auction = await this.auctionRepository.findOne({
            where: { id },
            relations: ['creator', 'winner'],
        });

        if (!auction) {
            throw new NotFoundException('Auction not found');
        }

        const bids = await this.bidRepository.find({
            where: { auctionItemId: id },
            order: { createdAt: 'DESC' },
            take: 20,
            relations: ['bidder'],
        });

        return {
            id: auction.id,
            title: auction.title,
            description: auction.description,
            startingPrice: auction.startingPrice,
            currentPrice: auction.currentPrice,
            status: auction.status,
            endsAt: auction.endsAt,
            createdAt: auction.createdAt,
            creator: auction.creator
                ? { id: auction.creator.id, email: auction.creator.email }
                : null,
            winner: auction.winner
                ? { id: auction.winner.id, email: auction.winner.email }
                : null,
            bids: bids.map((bid) => ({
                id: bid.id,
                amount: bid.amount,
                createdAt: bid.createdAt,
                bidder: bid.bidder
                    ? { id: bid.bidder.id, email: bid.bidder.email }
                    : null,
            })),
        };
    }

    async placeBid(
        auctionId: string,
        bidderId: string,
        dto: PlaceBidDto,
    ): Promise<{ bid: Bid; auction: AuctionItem }> {
        const bidAmount = new Decimal(dto.amount).toFixed(2);
        let outbidUserId: string | null = null;

        // Use transaction with pessimistic locking
        const result = await this.dataSource.transaction(async (manager) => {
            // 1. Lock the auction row for update
            const auction = await manager.findOne(AuctionItem, {
                where: { id: auctionId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!auction) {
                throw new NotFoundException('Auction not found');
            }

            // 2. Validate auction is active
            if (auction.status !== AuctionStatus.ACTIVE) {
                throw new BadRequestException('Auction is not active');
            }

            // 3. Check if auction has ended
            const now = new Date();
            if (now >= auction.endsAt) {
                throw new BadRequestException('Auction has ended');
            }

            // 4. Validate bid amount is higher than current price
            if (new Decimal(bidAmount).lte(new Decimal(auction.currentPrice))) {
                throw new BadRequestException(
                    `Bid must be higher than current price: ${auction.currentPrice}`,
                );
            }

            // 5. Check bidder is not the creator
            if (auction.creatorId === bidderId) {
                throw new BadRequestException('Cannot bid on your own auction');
            }

            // 6. Lock and validate bidder balance
            const bidder = await manager.findOne(User, {
                where: { id: bidderId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!bidder) {
                throw new BadRequestException('Bidder not found');
            }

            const bidderBalance = new Decimal(bidder.balance);
            if (bidderBalance.lt(bidAmount)) {
                throw new BadRequestException(
                    `Insufficient balance. Required: ${bidAmount}, Available: ${bidder.balance}`,
                );
            }

            // 7. Refund previous highest bidder (if exists)
            outbidUserId = auction.winnerId;
            if (outbidUserId && outbidUserId !== bidderId) {
                const previousWinner = await manager.findOne(User, {
                    where: { id: outbidUserId },
                    lock: { mode: 'pessimistic_write' },
                });

                if (previousWinner) {
                    const refundAmount = new Decimal(previousWinner.balance)
                        .plus(auction.currentPrice)
                        .toFixed(2);
                    await manager.update(User, previousWinner.id, {
                        balance: refundAmount,
                    });
                }
            }

            // 8. Deduct from new bidder (escrow)
            const newBidderBalance = bidderBalance.minus(bidAmount).toFixed(2);
            await manager.update(User, bidderId, { balance: newBidderBalance });

            // 9. Update auction
            auction.currentPrice = bidAmount;
            auction.winnerId = bidderId;

            // 10. Anti-sniping: extend auction if bid placed in final threshold
            const antiSnipeThreshold = this.configService.get<number>(
                'app.antiSnipeThresholdSeconds',
                10,
            );
            const antiSnipeExtension = this.configService.get<number>(
                'app.antiSnipeExtensionSeconds',
                30,
            );

            const timeLeftMs = auction.endsAt.getTime() - now.getTime();
            if (timeLeftMs < antiSnipeThreshold * 1000) {
                const newEndsAt = new Date(
                    auction.endsAt.getTime() + antiSnipeExtension * 1000,
                );
                auction.endsAt = newEndsAt;

                // Reschedule the settlement job
                await this.jobsService.scheduleAuctionSettlement(auction.id, newEndsAt);

                // Reschedule the ending reminder job
                const reminderTime = new Date(newEndsAt.getTime() - 5 * 60 * 1000);
                await this.jobsService.scheduleEndingReminder(auction.id, reminderTime);
            }

            await manager.save(AuctionItem, auction);

            // 11. Create bid record
            const bid = manager.create(Bid, {
                amount: bidAmount,
                bidderId,
                auctionItemId: auctionId,
            });
            await manager.save(Bid, bid);

            return { bid, auction, bidderEmail: bidder.email };
        });

        // 12. Emit WebSocket events AFTER transaction commits
        this.auctionGateway.emitNewBid(auctionId, {
            bidId: result.bid.id,
            amount: result.bid.amount,
            bidderId: result.bid.bidderId,
            bidderName: (result as any).bidderEmail, // Need to return email from transaction
            currentPrice: result.auction.currentPrice,
            endsAt: result.auction.endsAt,
        });

        // 13. Schedule outbid notification for previous winner
        if (outbidUserId && outbidUserId !== bidderId) {
            await this.jobsService.scheduleOutbidNotification(
                auctionId,
                outbidUserId,
                result.bid.amount,
            );
        }

        return result;
    }

    async settleAuction(auctionId: string): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const auction = await manager.findOne(AuctionItem, {
                where: { id: auctionId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!auction) {
                return; // Already settled or doesn't exist
            }

            // Idempotency check: skip if already settled
            if (
                auction.status === AuctionStatus.SOLD ||
                auction.status === AuctionStatus.EXPIRED
            ) {
                return;
            }

            if (auction.winnerId) {
                auction.status = AuctionStatus.SOLD;

                // Transfer funds to creator
                const creator = await manager.findOne(User, {
                    where: { id: auction.creatorId },
                    lock: { mode: 'pessimistic_write' },
                });

                if (creator) {
                    const newBalance = new Decimal(creator.balance)
                        .plus(auction.currentPrice)
                        .toFixed(2);
                    await manager.update(User, creator.id, { balance: newBalance });
                }

                // Fetch winner for name
                const winner = await manager.findOne(User, {
                    where: { id: auction.winnerId },
                });

                this.auctionGateway.emitAuctionSold(auctionId, {
                    winnerId: auction.winnerId,
                    winnerName: winner ? winner.email : 'Unknown',
                    finalPrice: auction.currentPrice,
                });
            } else {
                auction.status = AuctionStatus.EXPIRED;
                this.auctionGateway.emitAuctionExpired(auctionId);
            }

            await manager.save(AuctionItem, auction);
        });
    }

    async findWinners() {
        const auctions = await this.auctionRepository.find({
            where: { status: AuctionStatus.SOLD },
            relations: ['winner'],
            order: { endsAt: 'DESC' },
        });

        return auctions.map((auction) => ({
            id: auction.id,
            title: auction.title,
            finalPrice: auction.currentPrice,
            winner: auction.winner
                ? { id: auction.winner.id, email: auction.winner.email }
                : null,
            endedAt: auction.endsAt,
        }));
    }

    async findById(id: string): Promise<AuctionItem | null> {
        return this.auctionRepository.findOne({ where: { id } });
    }
}
