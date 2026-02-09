import React, { useState } from 'react';
import { Form, InputNumber, Button, notification } from 'antd';
import { auctionsApi } from '../api/auctions.api';
import { useAuth } from '../auth/AuthContext';

interface BidFormProps {
    auctionId: string;
    currentPrice: number;
    minIncrement?: number;
    disabled?: boolean;
    onBidSuccess?: () => void;
}

export const BidForm: React.FC<BidFormProps> = ({
    auctionId,
    currentPrice,
    minIncrement = 1,
    disabled = false,
    onBidSuccess,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { refreshUser } = useAuth();

    const minBidAmount = Number(currentPrice) + Number(minIncrement);

    const onFinish = async (values: { amount: number }) => {
        setLoading(true);
        try {
            await auctionsApi.placeBid(auctionId, { amount: values.amount });

            notification.success({
                message: 'Bid Placed',
                description: `Successfully placed bid of $${values.amount.toFixed(2)}`,
            });

            // Refresh user balance after successful bid
            await refreshUser();

            form.resetFields();

            // Notify parent to re-fetch auction data
            if (onBidSuccess) {
                onBidSuccess();
            }
        } catch (error: any) {
            // Show backend validation errors
            const errorMessage = error.response?.data?.message || 'Failed to place bid';
            notification.error({
                message: 'Bid Failed',
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
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
                <Button type="primary" htmlType="submit" loading={loading} disabled={disabled}>
                    Place Bid
                </Button>
            </Form.Item>
        </Form>
    );
};
