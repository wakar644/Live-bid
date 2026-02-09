import apiClient from './axios';
import type { Auction, AuctionListResponse, PlaceBidRequest, PlaceBidResponse } from '../types/auction';

export const auctionsApi = {
    getAuctions: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<AuctionListResponse> => {
        const response = await apiClient.get<AuctionListResponse>('/auctions', { params });
        return response.data;
    },

    getAuctionById: async (id: string): Promise<Auction> => {
        const response = await apiClient.get<Auction>(`/auctions/${id}`);
        return response.data;
    },

    getAuctionBids: async (id: string, params?: { limit?: number }): Promise<{ bids: import('../types/auction').Bid[] }> => {
        const response = await apiClient.get<{ bids: import('../types/auction').Bid[] }>(`/auctions/${id}/bids`, { params });
        return response.data;
    },

    placeBid: async (auctionId: string, data: PlaceBidRequest): Promise<PlaceBidResponse> => {
        const response = await apiClient.post<PlaceBidResponse>(
            `/auctions/${auctionId}/bids`,
            data
        );
        return response.data;
    },
};
