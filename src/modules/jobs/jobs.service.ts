import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const AUCTION_QUEUE = 'auction';

export enum JobType {
    SETTLEMENT = 'settlement',
    ENDING_REMINDER = 'ending_reminder',
    OUTBID_NOTIFICATION = 'outbid_notification',
}

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        @InjectQueue(AUCTION_QUEUE) private auctionQueue: Queue,
    ) { }

    async scheduleAuctionSettlement(auctionId: string, endsAt: Date): Promise<void> {
        const delay = Math.max(0, endsAt.getTime() - Date.now());
        const jobId = `settlement_${auctionId}`;

        // Remove existing job if rescheduling (for anti-snipe extension)
        const existingJob = await this.auctionQueue.getJob(jobId);
        if (existingJob) {
            await existingJob.remove();
            this.logger.log(`Removed existing settlement job: ${jobId}`);
        }

        await this.auctionQueue.add(
            JobType.SETTLEMENT,
            { auctionId },
            {
                jobId,
                delay,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: {
                    age: 3600, // 1 hour
                    count: 100,
                },
                removeOnFail: {
                    age: 86400, // 24 hours
                    count: 1000,
                },
            },
        );

        this.logger.log(
            `Scheduled settlement for auction ${auctionId} in ${delay}ms`,
        );
    }

    async scheduleEndingReminder(auctionId: string, reminderTime: Date): Promise<void> {
        const delay = Math.max(0, reminderTime.getTime() - Date.now());
        const jobId = `reminder_${auctionId}`;

        // Remove existing reminder if it exists (for anti-snipe extension)
        const existingJob = await this.auctionQueue.getJob(jobId);
        if (existingJob) {
            await existingJob.remove();
            this.logger.log(`Removed existing reminder job: ${jobId}`);
        }

        if (delay > 0) {
            await this.auctionQueue.add(
                JobType.ENDING_REMINDER,
                { auctionId },
                {
                    jobId,
                    delay,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: true,
                    removeOnFail: {
                        age: 3600,
                    },
                },
            );

            this.logger.log(
                `Scheduled ending reminder for auction ${auctionId} in ${delay}ms`,
            );
        } else {
            this.logger.warn(
                `Reminder time for auction ${auctionId} is in the past, skipping scheduling`,
            );
        }
    }

    async scheduleOutbidNotification(
        auctionId: string,
        userId: string,
        newBidAmount: string,
    ): Promise<void> {
        await this.auctionQueue.add(
            JobType.OUTBID_NOTIFICATION,
            { auctionId, userId, newBidAmount },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: {
                    age: 3600,
                },
            },
        );

        this.logger.log(
            `Scheduled outbid notification for user ${userId} on auction ${auctionId}`,
        );
    }
}
