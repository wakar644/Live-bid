import React, { useState, useEffect } from 'react';
import { Table, Select, Typography, Tag, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { auctionsApi } from '../api/auctions.api';
import type { Auction } from '../types/auction';

const { Title } = Typography;
const { Option } = Select;

export const AuctionList: React.FC = () => {
    const [auctions, setAuctions] = useState<Auction[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [status, setStatus] = useState<string>('');
    const navigate = useNavigate();
    const pageSize = 10;

    useEffect(() => {
        fetchAuctions();
    }, [page, status]);

    const fetchAuctions = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: pageSize };
            if (status) params.status = status;

            const response = await auctionsApi.getAuctions(params);
            setAuctions(response.auctions);
            setTotal(response.total);
        } catch (error: any) {
            notification.error({
                message: 'Failed to Load Auctions',
                description: error.response?.data?.message || 'Unable to fetch auctions. Please try again.',
            });
            setAuctions([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

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
            dataIndex: 'endTime',
            key: 'endTime',
            render: (endTime: string) => formatDateTime(endTime),
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

            <Table
                columns={columns}
                dataSource={auctions}
                rowKey="id"
                loading={loading}
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
