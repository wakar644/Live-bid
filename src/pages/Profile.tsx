import React, { useState } from 'react';
import { Card, Typography, Button, Statistic, Row, Col, Modal, InputNumber, notification } from 'antd';
import { useAuth } from '../auth/AuthContext';
import { UserOutlined, WalletOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const Profile: React.FC = () => {
    const { user, setUser } = useAuth(); // Assuming setUser is available or we need to refetch
    // actually setUser might handle local state update, but backend update is better.
    // implementing mock funds for now.
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [addAmount, setAddAmount] = useState<number | null>(100);

    const handleAddFunds = () => {
        if (!addAmount || !user) return;

        // MOCK: Update local balance visualization
        // In real app: Calls API POST /wallet/deposit
        const newBalance = parseFloat(user.balance) + addAmount;

        notification.success({
            message: 'Funds Added',
            description: `Successfully added $${addAmount} to your wallet. (Mock)`,
        });

        // Assuming we can't easily update context user without reload or method, 
        // we might just show success. 
        // But let's try to verify if we have refreshUser?
        // For now, close modal.
        setIsModalOpen(false);
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
