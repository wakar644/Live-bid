import React, { useState } from 'react';
import { Card, Typography, Button, Statistic, Row, Col, Modal, InputNumber, notification } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../api/auth.api';
import { UserOutlined, WalletOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const Profile: React.FC = () => {
    const { user: authUser, setUser } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [addAmount, setAddAmount] = useState<number | null>(100);

    // Use TanStack Query for fetching user profile
    const { data: user } = useQuery({
        queryKey: ['profile'],
        queryFn: () => authApi.getProfile(),
        initialData: authUser || undefined,
    });

    // Mock funds mutation
    const addFundsMutation = useMutation({
        mutationFn: async (amount: number) => {
            // MOCK: In real app: Calls API POST /wallet/deposit
            return { balance: (parseFloat(user?.balance || '0') + amount).toFixed(2) };
        },
        onSuccess: (data) => {
            notification.success({
                message: 'Funds Added',
                description: `Successfully added $${addAmount} to your wallet. (Mock)`,
            });

            // Update local context user
            if (authUser) {
                setUser({ ...authUser, balance: data.balance });
            }

            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setIsModalOpen(false);
        },
    });

    const handleAddFunds = () => {
        if (!addAmount || !user) return;
        addFundsMutation.mutate(addAmount);
    };

    if (!user) return null;

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
            <Title level={2} style={{ marginBottom: 24 }}>My Profile</Title>

            <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                    <Card title="Account Details" bordered={false}>
                        <div style={{ marginBottom: 16 }}>
                            <UserOutlined style={{ fontSize: 24, marginRight: 8 }} />
                            <Text strong style={{ fontSize: 18 }}>{user.username}</Text>
                        </div>
                        <div>
                            <Text type="secondary">Email: </Text>
                            <Text>{user.email}</Text>
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <Text type="secondary">User ID: </Text>
                            <Text code>{user.id}</Text>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12}>
                    <Card title="Wallet Balance" bordered={false}>
                        <Statistic
                            title="Current Balance"
                            value={user.balance}
                            precision={2}
                            prefix="$"
                            valueStyle={{ color: '#3f8600' }}
                        />
                        <Button
                            type="primary"
                            icon={<WalletOutlined />}
                            style={{ marginTop: 16 }}
                            onClick={() => setIsModalOpen(true)}
                        >
                            Add Funds
                        </Button>
                    </Card>
                </Col>
            </Row>

            <Modal title="Add Funds to Wallet" open={isModalOpen} onOk={handleAddFunds} onCancel={() => setIsModalOpen(false)}>
                <p>Select amount to deposit:</p>
                <InputNumber
                    min={1}
                    max={10000}
                    defaultValue={100}
                    prefix="$"
                    style={{ width: '100%' }}
                    onChange={(val) => setAddAmount(val)}
                    value={addAmount}
                />
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Note: This is a simulation. No real money is charged.
                </Text>
            </Modal>
        </div>
    );
};
