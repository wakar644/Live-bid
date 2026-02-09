import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { AUCTION_QUEUE, JobType } from '../jobs.service';
import { AuctionsService } from '../../auctions/auctions.service';
import { AuctionGateway } from '../../websocket/auction.gateway';

@Processor(AUCTION_QUEUE)
export class AuctionProcessor extends WorkerHost {
    private readonly logger = new Logger(AuctionProcessor.name);

    constructor(
        @Inject(forwardRef(() => AuctionsService))
        private auctionsService: AuctionsService,
        @Inject(forwardRef(() => AuctionGateway))
        private auctionGateway: AuctionGateway,
    ) {
        super();
    }

    async process(job: Job<any, any, JobType>): Promise<void> {
        this.logger.log(`Processing job ${job.id} of type ${job.name}`);

        switch (job.name) {
            case JobType.SETTLEMENT:
                await this.handleSettlement(job.data);
                break;
            case JobType.ENDING_REMINDER:
                await this.handleEndingReminder(job.data);
                break;
            case JobType.OUTBID_NOTIFICATION:
                await this.handleOutbidNotification(job.data);
                break;
            default:
                this.logger.warn(`Unknown job type: ${job.name}`);
        }
    }

    private async handleSettlement(data: { auctionId: string }): Promise<void> {
        const { auctionId } = data;
        this.logger.log(`Settling auction ${auctionId}`);

        // Idempotent: AuctionsService.settleAuction checks status before processing
        await this.auctionsService.settleAuction(auctionId);

        this.logger.log(`Auction ${auctionId} settled`);
    }

    private async handleEndingReminder(data: { auctionId: string }): Promise<void> {
        const { auctionId } = data;
        this.logger.log(`Sending ending reminder for auction ${auctionId}`);

        const auction = await this.auctionsService.findById(auctionId);
        if (auction && auction.status === 'active') {
            this.auctionGateway.emitAuctionEndingSoon(auctionId, auction.endsAt);
        }
    }

    private async handleOutbidNotification(data: {
        auctionId: string;
        userId: string;
        newBidAmount: string;
    }): Promise<void> {
        const { auctionId, userId, newBidAmount } = data;
        this.logger.log(
            `Would send outbid notification to user ${userId} for auction ${auctionId}, new bid: ${newBidAmount}`,
        );
        // In a real system, this would send an email or push notification
        // For now, we just log it
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.log(`Job ${job.id} completed`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
    }
}
