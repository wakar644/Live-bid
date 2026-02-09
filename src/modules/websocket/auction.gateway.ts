import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AuctionsService } from '../auctions/auctions.service';

export enum WsEvents {
    NEW_BID = 'NEW_BID',
    AUCTION_ENDING_SOON = 'AUCTION_ENDING_SOON',
    AUCTION_SOLD = 'AUCTION_SOLD',
    AUCTION_EXPIRED = 'AUCTION_EXPIRED',
    VIEWER_COUNT = 'VIEWER_COUNT',
    AUCTION_STATE = 'AUCTION_STATE',
    ERROR = 'ERROR',
}

interface BidEventPayload {
    bidId: string;
    amount: string;
    bidderId: string;
    currentPrice: string;
    endsAt: Date;
}

interface AuctionSoldPayload {
    winnerId: string;
    finalPrice: string;
}

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: '/',
})
export class AuctionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(AuctionGateway.name);
    private readonly viewerCountKey = 'auction:viewers:';

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        @Inject(REDIS_CLIENT) private redis: Redis,
        @Inject(forwardRef(() => AuctionsService))
        private auctionsService: AuctionsService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = this.extractToken(client);

            if (token) {
                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get('jwt.secret'),
                });
                client.data.userId = payload.sub;
                client.data.email = payload.email;
                client.data.authenticated = true;
                this.logger.log(`Client connected: ${client.id}, User: ${payload.email}`);
            } else {
                // Allow anonymous connections for viewing
                client.data.authenticated = false;
                this.logger.log(`Anonymous client connected: ${client.id}`);
            }
        } catch (error) {
            client.data.authenticated = false;
            this.logger.warn(`Auth failed for client ${client.id}: ${error.message}`);
        }
    }

    async handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Clean up viewer counts for all rooms this client was in
        const rooms = Array.from(client.rooms);
        for (const room of rooms) {
            if (room.startsWith('auction:')) {
                const auctionId = room.replace('auction:', '');
                await this.decrementViewerCount(auctionId);
                await this.broadcastViewerCount(auctionId);
            }
        }
    }

    @SubscribeMessage('join_auction')
    async handleJoinAuction(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { auctionId: string } | string,
    ) {
        let auctionId: string;

        if (typeof data === 'string') {
            auctionId = data;
        } else if (data && typeof data === 'object' && 'auctionId' in data) {
            auctionId = data.auctionId;
        } else {
            this.logger.error(`Invalid join_auction payload from ${client.id}: ${JSON.stringify(data)}`);
            client.emit(WsEvents.ERROR, { message: 'Invalid payload. Expected { auctionId: string } or string' });
            return;
        }

        if (!auctionId) {
            this.logger.error(`Received empty auctionId from ${client.id}`);
            return;
        }

        const room = `auction:${auctionId}`;

        // Leave all other auction rooms first
        const currentRooms = Array.from(client.rooms);
        for (const r of currentRooms) {
            if (r.startsWith('auction:') && r !== room) {
                await client.leave(r);
                const oldAuctionId = r.replace('auction:', '');
                await this.decrementViewerCount(oldAuctionId);
                await this.broadcastViewerCount(oldAuctionId);
            }
        }

        // Join new room
        await client.join(room);
        await this.incrementViewerCount(auctionId);
        await this.broadcastViewerCount(auctionId);

        this.logger.log(`Client ${client.id} joined room ${room} (Auction ID: ${auctionId})`);

        // Send current auction state on join
        try {
            const auction = await this.auctionsService.findOne(auctionId);
            client.emit(WsEvents.AUCTION_STATE, auction);
            this.logger.log(`Sent initial state for auction ${auctionId} to client ${client.id}`);
        } catch (error) {
            this.logger.warn(`Auction ${auctionId} not found for client ${client.id}`);
            client.emit(WsEvents.ERROR, { message: 'Auction not found' });
        }

        return { success: true, room };
    }

    @SubscribeMessage('leave_auction')
    async handleLeaveAuction(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { auctionId: string },
    ) {
        const { auctionId } = data;
        const room = `auction:${auctionId}`;

        await client.leave(room);
        await this.decrementViewerCount(auctionId);
        await this.broadcastViewerCount(auctionId);

        this.logger.log(`Client ${client.id} left room ${room}`);
        return { success: true };
    }

    // Emit methods called from AuctionsService after transaction commits
    emitNewBid(auctionId: string, payload: BidEventPayload) {
        const room = `auction:${auctionId}`;
        this.server.to(room).emit(WsEvents.NEW_BID, {
            ...payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Emitted NEW_BID to ${room}`);
    }

    emitAuctionEndingSoon(auctionId: string, endsAt: Date) {
        const room = `auction:${auctionId}`;
        this.server.to(room).emit(WsEvents.AUCTION_ENDING_SOON, {
            auctionId,
            endsAt,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Emitted AUCTION_ENDING_SOON to ${room}`);
    }

    emitAuctionSold(auctionId: string, payload: AuctionSoldPayload) {
        const room = `auction:${auctionId}`;
        this.server.to(room).emit(WsEvents.AUCTION_SOLD, {
            auctionId,
            ...payload,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Emitted AUCTION_SOLD to ${room}`);
    }

    emitAuctionExpired(auctionId: string) {
        const room = `auction:${auctionId}`;
        this.server.to(room).emit(WsEvents.AUCTION_EXPIRED, {
            auctionId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Emitted AUCTION_EXPIRED to ${room}`);
    }

    // Redis-backed viewer count tracking
    private async incrementViewerCount(auctionId: string): Promise<number> {
        const key = `${this.viewerCountKey}${auctionId}`;
        return this.redis.incr(key);
    }

    private async decrementViewerCount(auctionId: string): Promise<number> {
        const key = `${this.viewerCountKey}${auctionId}`;
        const count = await this.redis.decr(key);
        // Ensure count doesn't go below 0
        if (count < 0) {
            await this.redis.set(key, 0);
            return 0;
        }
        return count;
    }

    private async getViewerCount(auctionId: string): Promise<number> {
        const key = `${this.viewerCountKey}${auctionId}`;
        const count = await this.redis.get(key);
        return count ? parseInt(count, 10) : 0;
    }

    private async broadcastViewerCount(auctionId: string): Promise<void> {
        const count = await this.getViewerCount(auctionId);
        const room = `auction:${auctionId}`;
        this.server.to(room).emit(WsEvents.VIEWER_COUNT, {
            auctionId,
            count,
            timestamp: new Date().toISOString(),
        });
    }

    private extractToken(client: Socket): string | null {
        const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;

        if (typeof auth === 'string') {
            if (auth.startsWith('Bearer ')) {
                return auth.substring(7);
            }
            return auth;
        }

        return null;
    }
}
