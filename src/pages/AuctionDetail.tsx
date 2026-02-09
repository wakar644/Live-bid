import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, List, Typography, Spin, Button, Space, Alert, notification } from 'antd';
import { EyeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
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
    const { user } = useAuth();
    const [auction, setAuction] = useState<Auction | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);
    const [isEndingSoon, setIsEndingSoon] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

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
        if (!socket) {
            console.warn('Socket not initialized despite user being logged in');
            return;
        }

        // Initialize connection state immediately
        setSocketConnected(socket.connected);

        console.log('🔌 Socket joining room:', `auction:${id}`);
        socket.emit('join', `auction:${id}`);

        // DEBUG: Listen to ALL events to see what's coming in
        socket.onAny((eventName, ...args) => {
            console.log(`📡 Received event '${eventName}':`, args);
        });

        const handleConnect = () => {
            console.log('✅ Socket connected (in component)');
            setSocketConnected(true);
            // Re-join on reconnect
            socket.emit('join', `auction:${id}`);
            fetchAuction();
        };

        const handleDisconnect = () => {
            console.log('❌ Socket disconnected (in component)');
            setSocketConnected(false);
        };

        // Handle NEW_BID event
        const handleNewBid = (event: NewBidEvent) => {
            // console.log('Socket event received: NEW_BID', event);
            if (String(event.auctionId) === String(id)) {
                fetchAuction();
            } else {
                console.warn(`Event ID mismatch: received ${event.auctionId}, expected ${id}`);
            }
        };

        const handleViewerCount = (event: ViewerCountEvent) => {
            if (String(event.auctionId) === String(id)) {
                setViewerCount(event.count);
            }
        };

        const handleEndingSoon = (event: AuctionEndingSoonEvent) => {
            if (String(event.auctionId) === String(id)) setIsEndingSoon(true);
        };

        const handleAuctionSold = (event: AuctionSoldEvent) => {
            if (String(event.auctionId) === String(id)) fetchAuction();
        };

        const handleAuctionExpired = (event: AuctionExpiredEvent) => {
            if (String(event.auctionId) === String(id)) fetchAuction();
        };

        // Attach listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        socket.on('NEW_BID', handleNewBid);
        socket.on('newBid', handleNewBid);
        socket.on('new_bid', handleNewBid);

        socket.on('VIEWER_COUNT', handleViewerCount);
        socket.on('viewerCount', handleViewerCount); // Add CamelCase variant
        socket.on('viewer_count', handleViewerCount); // Add snake_case variant

        socket.on('AUCTION_ENDING_SOON', handleEndingSoon);
        socket.on('AUCTION_SOLD', handleAuctionSold);
        socket.on('AUCTION_EXPIRED', handleAuctionExpired);

        return () => {
            socket.offAny(); // Remove debug listener
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('NEW_BID', handleNewBid);
            socket.off('newBid', handleNewBid);
            socket.off('new_bid', handleNewBid);
            socket.off('VIEWER_COUNT', handleViewerCount);
            socket.off('viewerCount', handleViewerCount);
            socket.off('viewer_count', handleViewerCount);
            socket.off('AUCTION_ENDING_SOON', handleEndingSoon);
            socket.off('AUCTION_SOLD', handleAuctionSold);
            socket.off('AUCTION_EXPIRED', handleAuctionExpired);

            console.log('🔌 Socket leaving room:', `auction:${id}`);
            socket.emit('leave', `auction:${id}`);
        };
    }, [id, fetchAuction]);

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

    const formatPrice = (price: number) => `$${Number(price).toFixed(2)}`;

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
                        <Tag color={socketConnected ? 'success' : 'error'}>
                            {socketConnected ? 'LIVE' : 'OFFLINE'}
                        </Tag>
                        <EyeOutlined />
                        <Text>{viewerCount} viewers</Text>
                    </Space>
                }
            >
                <Descriptions bordered column={1}>
                    <Descriptions.Item label="Description">{auction.description}</Descriptions.Item>
                    <Descriptions.Item label="Starting Price">
                        {formatPrice(auction.startingPrice)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Current Price">
                        <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                            {formatPrice(auction.currentPrice)}
                        </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Start Time">
                        {formatDateTime(auction.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="End Time">
                        {formatDateTime(auction.endsAt)}
                    </Descriptions.Item>
                </Descriptions>

                {!isBiddingDisabled && auction.status === 'active' && user?.id !== auction.creator.id && (
                    <BidForm
                        auctionId={auction.id}
                        currentPrice={auction.currentPrice}
                        minIncrement={auction.minimumBidIncrement}
                        onBidSuccess={fetchAuction}
                    />
                )}

                {user?.id === auction.creator.id && auction.status === 'active' && (
                    <Alert
                        message="You cannot bid on your own auction"
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
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
                                            <Text type="secondary">by {bid.id}</Text>
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
