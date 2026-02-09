import React from 'react';
import { Form, Input, InputNumber, DatePicker, Button, Card, Typography, Space, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { auctionsApi } from '../api/auctions.api';
import type { CreateAuctionRequest } from '../types/auction';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

export const CreateAuction: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [form] = Form.useForm();

    // Use TanStack Query mutation for creating auctions
    const mutation = useMutation({
        mutationFn: (auctionData: CreateAuctionRequest) => auctionsApi.createAuction(auctionData),
        onSuccess: (newAuction) => {
            notification.success({
                message: 'Auction Created',
                description: 'Your auction has been successfully listed.',
            });

            // Invalidate auctions query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['auctions'] });

            navigate(`/auctions/${newAuction.id}`);
        },
        onError: (error: any) => {
            notification.error({
                message: 'Failed to Create Auction',
                description: error.response?.data?.message || 'Please check your inputs and try again.',
            });
        },
    });

    const onFinish = (values: any) => {
        const auctionData: CreateAuctionRequest = {
            title: values.title,
            description: values.description,
            startingPrice: values.startingPrice,
            // minimumBidIncrement: values.minimumBidIncrement,
            endsAt: values.endsAt.toISOString(),
        };

        mutation.mutate(auctionData);
    };

    const disabledDate = (current: dayjs.Dayjs) => {
        // Can not select days before today and today
        return current && current < dayjs().endOf('day');
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/auctions')}>
                    Back to Auctions
                </Button>
            </Space>

            <Card>
                <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
                    Create New Auction
                </Title>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        minimumBidIncrement: 1,
                    }}
                >
                    <Form.Item
                        name="title"
                        label="Item Title"
                        rules={[{ required: true, message: 'Please enter the item title' }]}
                    >
                        <Input placeholder="e.g. Vintage Camera" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Description"
                        rules={[{ required: true, message: 'Please enter a description' }]}
                    >
                        <TextArea rows={4} placeholder="Describe the item condition, history, etc." />
                    </Form.Item>

                    <Space style={{ display: 'flex', width: '100%' }} align="baseline">
                        <Form.Item
                            name="startingPrice"
                            label="Starting Price ($)"
                            style={{ flex: 1 }}
                            rules={[
                                { required: true, message: 'Please enter starting price' },
                                { type: 'number', min: 0.01, message: 'Price must be greater than 0' },
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                prefix="$"
                                min={0.01}
                                step={0.01}
                                size="large"
                            />
                        </Form.Item>

                        {/* <Form.Item
                            name="minimumBidIncrement"
                            label="Min Bid Increment ($)"
                            style={{ flex: 1 }}
                            rules={[
                                { required: true, message: 'Please enter minimum bid increment' },
                                { type: 'number', min: 0.01, message: 'Increment must be greater than 0' },
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                prefix="$"
                                min={0.01}
                                step={0.01}
                                size="large"
                            />
                        </Form.Item> */}
                    </Space>

                    <Form.Item
                        name="endsAt"
                        label="End Date & Time"
                        rules={[{ required: true, message: 'Please select when the auction ends' }]}
                    >
                        <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm:ss"
                            disabledDate={disabledDate}
                            style={{ width: '100%' }}
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" size="large" block loading={mutation.isPending}>
                            Create Auction
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};
