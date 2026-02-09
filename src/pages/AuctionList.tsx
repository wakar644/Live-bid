import React, { useState } from 'react';
import { Table, Select, Typography, Tag, notification, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auctionsApi } from '../api/auctions.api';


const { Title } = Typography;
const { Option } = Select;

export const AuctionList: React.FC = () => {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>('');
    const navigate = useNavigate();
    const pageSize = 10;

    // Use TanStack Query for data fetching and caching
    const { data, isLoading, error } = useQuery({
        queryKey: ['auctions', { page, status }],
        queryFn: () => {
            const params: any = { page, limit: pageSize };
            if (status) params.status = status;
            return auctionsApi.getAuctions(params);
        },
    });

    // Show error notification when query fails
    React.useEffect(() => {
        if (error) {
            notification.error({
                message: 'Failed to Load Auctions',
                description: (error as any).response?.data?.message || 'Unable to fetch auctions. Please try again.',
            });
        }
    }, [error]);

    const auctions = data?.items || [];
    const total = data?.pagination?.total || 0;

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

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            width: '30%',
        },
        {
            title: 'Current Price',
            dataIndex: 'currentPrice',
            key: 'currentPrice',
            render: (price: number) => (
                <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {formatPrice(price)}
                </span>
            ),
        },
        {
            title: 'Ends At',
            dataIndex: 'endsAt',
            key: 'endsAt',
            render: (endsAt: string) => formatDateTime(endsAt),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2}>Auctions</Title>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Button type="primary" onClick={() => navigate('/auctions/create')}>
                        Create Auction
                    </Button>
                    <Select
                        placeholder="Filter by status"
                        style={{ width: 200 }}
                        allowClear
                        value={status || undefined}
                        onChange={(value) => {
                            setStatus(value || '');
                            setPage(1);
                        }}
                    >
                        <Option value="pending">Pending</Option>
                        <Option value="active">Active</Option>
                        <Option value="sold">Sold</Option>
                        <Option value="expired">Expired</Option>
                    </Select>
                </div>
            </div>

            <Table
                columns={columns}
                dataSource={auctions}
                rowKey="id"
                loading={isLoading}
                pagination={{
                    current: page,
                    pageSize: pageSize,
                    total: total,
                    onChange: (newPage) => setPage(newPage),
                    showSizeChanger: false,
                    showTotal: (total) => `Total ${total} auctions`,
                }}
                onRow={(record) => ({
                    onClick: () => navigate(`/auctions/${record.id}`),
                    style: { cursor: 'pointer' },
                })}
            />
        </div>
    );
};
