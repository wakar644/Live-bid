import React from 'react';
import { Form, InputNumber, Button, notification } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auctionsApi } from '../api/auctions.api';
import { useAuth } from '../auth/AuthContext';

interface BidFormProps {
    auctionId: string;
    currentPrice: number;
    minIncrement?: number;
    disabled?: boolean;
}

export const BidForm: React.FC<BidFormProps> = ({
    auctionId,
    currentPrice,
    minIncrement = 1,
    disabled = false,
}) => {
    const [form] = Form.useForm();
    const queryClient = useQueryClient();
    const { refreshUser } = useAuth();

    const minBidAmount = Number(currentPrice) + Number(minIncrement);

    // Use TanStack Query mutation for placing bids
    const mutation = useMutation({
        mutationFn: (amount: number) => auctionsApi.placeBid(auctionId, { amount }),
        onSuccess: async (_data, variables) => {
            notification.success({
                message: 'Bid Placed',
                description: `Successfully placed bid of $${variables.toFixed(2)}`,
            });

            // Refresh user balance after successful bid
            await refreshUser();

            form.resetFields();

            // Invalidate queries to trigger re-fetch
            queryClient.invalidateQueries({ queryKey: ['auction', auctionId] });
            queryClient.invalidateQueries({ queryKey: ['auction-bids', auctionId] });
        },
        onError: (error: any) => {
            // Show backend validation errors
            const errorMessage = error.response?.data?.message || 'Failed to place bid';
            notification.error({
                message: 'Bid Failed',
                description: errorMessage,
            });
        },
    });

    const onFinish = (values: { amount: number }) => {
        mutation.mutate(values.amount);
    };

    return (
        <Form
            form={form}
            onFinish={onFinish}
            layout="inline"
            style={{ marginTop: 16 }}
        >
            <Form.Item
                name="amount"
                rules={[
                    { required: true, message: 'Please enter bid amount' },
                    {
                        type: 'number',
                        min: minBidAmount,
                        message: `Minimum bid is $${minBidAmount.toFixed(2)}`,
                    },
                ]}
            >
                <InputNumber
                    prefix="$"
                    placeholder={`Min: $${minBidAmount.toFixed(2)}`}
                    style={{ width: 200 }}
                    step={minIncrement}
                    precision={2}
                    disabled={disabled}
                />
            </Form.Item>

            <Form.Item>
                <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={disabled}>
                    Place Bid
                </Button>
            </Form.Item>
        </Form>
    );
};
