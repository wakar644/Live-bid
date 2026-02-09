import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class HealthService extends HealthIndicator {
    constructor(@Inject(REDIS_CLIENT) private redis: Redis) {
        super();
    }

    async checkRedis(): Promise<HealthIndicatorResult> {
        try {
            await this.redis.ping();
            return this.getStatus('redis', true);
        } catch (error) {
            return this.getStatus('redis', false, { message: error.message });
        }
    }
}
