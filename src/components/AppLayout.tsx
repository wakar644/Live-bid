import React from 'react';
import { Layout, Menu, Button, Space } from 'antd';
import { LogoutOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BalanceBadge } from './BalanceBadge';

const { Header, Content } = Layout;

export const AppLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <TrophyOutlined style={{ fontSize: '24px', color: '#fff', marginRight: '12px' }} />
                    <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>LiveBid</span>
                    <Menu
                        theme="dark"
                        mode="horizontal"
                        selectedKeys={[window.location.pathname]}
                        style={{ marginLeft: '24px', flex: 1 }}
                        items={[
                            {
                                key: '/auctions',
                                label: 'Auctions',
                                onClick: () => navigate('/auctions'),
                            },
                            {
                                key: '/my-auctions',
                                label: 'My Auctions',
                                onClick: () => navigate('/my-auctions'),
                            },
                        ]}
                    />
                </div>
                <Space size="large">
                    <BalanceBadge />
                    <Button type="text" onClick={() => navigate('/profile')} style={{ color: '#fff' }}>
                        {user?.username}
                    </Button>
                    <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#fff' }}>
                        Logout
                    </Button>
                </Space>
            </Header>
            <Content style={{ padding: '24px' }}>
                <Outlet />
            </Content>
        </Layout>
    );
};
