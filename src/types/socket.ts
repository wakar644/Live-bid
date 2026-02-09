import type { Bid } from './auction';

export interface NewBidEvent {
    bid: Bid;
    auctionId: string;
    currentPrice: number;
}

export interface AuctionEndingSoonEvent {
    auctionId: string;
    timeRemaining: number;
}

export interface AuctionSoldEvent {
    auctionId: string;
    finalPrice: number;
    winnerUsername: string;
}

export interface AuctionExpiredEvent {
    auctionId: string;
}

export interface ViewerCountEvent {
    auctionId: string;
    count: number;
}
