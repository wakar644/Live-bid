export interface Bid {
    id: string;
    amount: number;
    userId: string;
    username: string;
    createdAt: string;
}

export interface Auction {
    id: string;
    title: string;
    description: string;
    startPrice: number;
    currentPrice: number;
    minimumBidIncrement: number;
    startTime: string;
    endTime: string;
    status: 'pending' | 'active' | 'sold' | 'expired';
    sellerId: string;
    highestBidderId?: string;
    highestBidderUsername?: string;
    bids?: Bid[];
    viewerCount?: number;
}

export interface AuctionListResponse {
    auctions: Auction[];
    total: number;
    page: number;
    limit: number;
}

export interface PlaceBidRequest {
    amount: number;
}

export interface PlaceBidResponse {
    bid: Bid;
    auction: Auction;
}
