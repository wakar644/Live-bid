import React, { useState } from 'react';
import { Tabs, Table, Tag, Typography, Button, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { auctionsApi } from '../api/auctions.api';
import type { Auction } from '../types/auction';

const { Title } = Typography;

export const MyAuctions: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('listings');

    // Use TanStack Query for fetching user listings
    const { data: listings, isLoading } = useQuery({
        queryKey: ['my-auctions', { userId: user?.id, type: 'listings' }],
        queryFn: () => auctionsApi.getAuctions({ sellerId: user?.id, limit: 100 }),
        enabled: !!user && activeTab === 'listings',
    });

    const auctions = listings?.items || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'pending': return 'blue';
            case 'sold': return 'gold';
            case 'expired': return 'red';
            default: return 'default';
        }
    };

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Current Price',
            dataIndex: 'currentPrice',
            key: 'currentPrice',
            render: (price: number) => `$${Number(price).toFixed(2)}`,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: Auction) => (
                <Button size="small" onClick={() => navigate(`/auctions/${record.id}`)}>
                    View
                </Button>
            ),
        },
    ];

    const items = [
        {
            key: 'listings',
            label: 'My Listings',
            children: (
                <Table
                    columns={columns}
                    dataSource={auctions}
                    rowKey="id"
                    loading={isLoading}
                    pagination={{ pageSize: 10 }}
                />
            ),
        },
        {
            key: 'bids',
            label: 'My Bids',
            children: (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <Empty description="Bid history feature coming soon!" />
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>My Activity</Title>
            <Tabs defaultActiveKey="listings" onChange={setActiveTab} items={items} />
        </div>
    );
};
