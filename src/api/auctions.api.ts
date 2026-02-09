import apiClient from './axios';
import type { Auction, AuctionListResponse, PlaceBidRequest, PlaceBidResponse, CreateAuctionRequest } from '../types/auction';

export const auctionsApi = {
    getAuctions: async (params?: {
        page?: number;
        limit?: number;
        status?: string;
        sellerId?: string;
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
            `/auctions/${auctionId}/bid`,
            data
        );
        return response.data;
    },

    createAuction: async (data: CreateAuctionRequest): Promise<Auction> => {
        const response = await apiClient.post<Auction>('/auctions', data);
        return response.data;
    },
};
