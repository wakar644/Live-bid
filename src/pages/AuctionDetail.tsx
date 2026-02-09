import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, List, Typography, Spin, Button, Space, Alert, notification } from 'antd';
import { EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { BidForm } from '../components/BidForm';
import { auctionsApi } from '../api/auctions.api';
import { getSocket } from '../sockets/socket';
import type { Auction, Bid } from '../types/auction';
import type {
    NewBidEvent,
    AuctionEndingSoonEvent,
    AuctionSoldEvent,
    AuctionExpiredEvent,
    ViewerCountEvent,
} from '../types/socket';

const { Title, Text } = Typography;

export const AuctionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [auction, setAuction] = useState<Auction | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [isEndingSoon, setIsEndingSoon] = useState(false);

    // Fetch auction details and bids
    const fetchAuction = useCallback(async () => {
        if (!id) return;

        try {
            const [auctionData, bidsData] = await Promise.all([
                auctionsApi.getAuctionById(id),
                auctionsApi.getAuctionBids(id, { limit: 20 }),
            ]);
            setAuction(auctionData);
            setBids(bidsData.bids);
        } catch (error: any) {
            notification.error({
                message: 'Failed to Load Auction',
                description: error.response?.data?.message || 'Unable to fetch auction details. Please try again.',
            });
            setAuction(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Initial fetch on mount
    useEffect(() => {
        fetchAuction();
    }, [fetchAuction]);

    // WebSocket integration
    useEffect(() => {
        if (!id || !auction) return;

        const socket = getSocket();
        if (!socket) return;

        // Join auction room
        socket.emit('join', `auction:${id}`);

        // Handle NEW_BID event - re-fetch auction state
        const handleNewBid = (event: NewBidEvent) => {
            if (event.auctionId === id) {
                fetchAuction();
            }
        };

        // Handle VIEWER_COUNT event - update count only
        const handleViewerCount = (event: ViewerCountEvent) => {
            if (event.auctionId === id) {
                setViewerCount(event.count);
            }
        };

        // Handle AUCTION_ENDING_SOON event - show warning
        const handleEndingSoon = (event: AuctionEndingSoonEvent) => {
            if (event.auctionId === id) {
                setIsEndingSoon(true);
            }
        };

        // Handle AUCTION_SOLD event - re-fetch to get final state
        const handleAuctionSold = (event: AuctionSoldEvent) => {
            if (event.auctionId === id) {
                fetchAuction();
            }
        };

        // Handle AUCTION_EXPIRED event - re-fetch to get final state
        const handleAuctionExpired = (event: AuctionExpiredEvent) => {
            if (event.auctionId === id) {
                fetchAuction();
            }
        };

        // Handle reconnect - re-fetch auction state
        const handleReconnect = () => {
            socket.emit('join', `auction:${id}`);
            fetchAuction();
        };

        // Attach event listeners
        socket.on('NEW_BID', handleNewBid);
        socket.on('VIEWER_COUNT', handleViewerCount);
        socket.on('AUCTION_ENDING_SOON', handleEndingSoon);
        socket.on('AUCTION_SOLD', handleAuctionSold);
        socket.on('AUCTION_EXPIRED', handleAuctionExpired);
        socket.on('connect', handleReconnect);

        // Cleanup: remove listeners and leave room
        return () => {
            socket.off('NEW_BID', handleNewBid);
            socket.off('VIEWER_COUNT', handleViewerCount);
            socket.off('AUCTION_ENDING_SOON', handleEndingSoon);
            socket.off('AUCTION_SOLD', handleAuctionSold);
            socket.off('AUCTION_EXPIRED', handleAuctionExpired);
            socket.off('connect', handleReconnect);
            socket.emit('leave', `auction:${id}`);
        };
    }, [id, auction, fetchAuction]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!auction) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <Alert
                    message="Auction Not Found"
                    description="The auction you're looking for doesn't exist or has been removed."
                    type="warning"
                    showIcon
                    action={
                        <Button onClick={() => navigate('/auctions')}>
                            Browse Auctions
                        </Button>
                    }
                />
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'green';
            case 'pending':
                return 'blue';
            case 'sold':
                return 'gold';
            case 'expired':
                return 'red';
            default:
                return 'default';
        }
    };

    const formatPrice = (price: number) => `$${price.toFixed(2)}`;

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const isBiddingDisabled = auction.status === 'sold' || auction.status === 'expired';

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/auctions')}>
                    Back to Auctions
                </Button>
            </Space>

            {isEndingSoon && auction.status === 'active' && (
                <Alert
                    message="Auction Ending Soon!"
                    description="This auction is about to end. Place your bids now!"
                    type="warning"
                    showIcon
                    closable
                    style={{ marginBottom: 16 }}
                />
            )}

            <Card
                title={
                    <Space>
                        <Title level={3} style={{ margin: 0 }}>
                            {auction.title}
                        </Title>
                        <Tag color={getStatusColor(auction.status)}>{auction.status.toUpperCase()}</Tag>
                    </Space>
                }
                extra={
                    <Space>
                        <EyeOutlined />
                        <Text>{viewerCount} viewers</Text>
                    </Space>
                }
            >
                <Descriptions bordered column={1}>
                    <Descriptions.Item label="Description">{auction.description}</Descriptions.Item>
                    <Descriptions.Item label="Starting Price">
                        {formatPrice(auction.startPrice)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current Price">
                        <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                            {formatPrice(auction.currentPrice)}
                        </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Start Time">
                        {formatDateTime(auction.startTime)}
                    </Descriptions.Item>
                    <Descriptions.Item label="End Time">
                        {formatDateTime(auction.endTime)}
                    </Descriptions.Item>
                </Descriptions>

                {!isBiddingDisabled && auction.status === 'active' && (
                    <BidForm
                        auctionId={auction.id}
                        currentPrice={auction.currentPrice}
                        minIncrement={auction.minimumBidIncrement}
                        onBidSuccess={fetchAuction}
                    />
                )}

                {isBiddingDisabled && (
                    <Alert
                        message={auction.status === 'sold' ? 'Auction Sold' : 'Auction Expired'}
                        description={
                            auction.status === 'sold'
                                ? 'This auction has been sold.'
                                : 'This auction has expired without a sale.'
                        }
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
                    />
                )}
            </Card>

            <Card title="Recent Bids (Last 20)" style={{ marginTop: 16 }}>
                {bids.length === 0 ? (
                    <Text type="secondary">No bids yet</Text>
                ) : (
                    <List
                        dataSource={bids}
                        renderItem={(bid) => (
                            <List.Item>
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            <Text strong>{formatPrice(bid.amount)}</Text>
                                            <Text type="secondary">by {bid.userId}</Text>
                                        </Space>
                                    }
                                    description={formatDateTime(bid.createdAt)}
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Card>
        </div>
    );
};
