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
    startingPrice: number;
    currentPrice: number;
    minimumBidIncrement: number;
    createdAt: string;
    endsAt: string;
    status: 'pending' | 'active' | 'sold' | 'expired';
    sellerId: string;
    highestBidderId?: string;
    highestBidderUsername?: string;
    bids?: Bid[];
    creator: {
        id: string;
        email: string;
    }
    viewerCount?: number;
}

export interface AuctionListResponse {
    items: Auction[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}

export interface PlaceBidRequest {
    amount: number;
}

export interface PlaceBidResponse {
    bid: Bid;
    auction: Auction;
}

export interface CreateAuctionRequest {
    title: string;
    description: string;
    startingPrice: number;
    // minimumBidIncrement: number;
    endsAt: string;
}
