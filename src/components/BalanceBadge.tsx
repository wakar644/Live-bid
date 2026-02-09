import React from 'react';
import { Badge } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

export const BalanceBadge: React.FC = () => {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <Badge
            count={`$${Number(user.balance).toFixed(2)}`}
            style={{
                backgroundColor: '#52c41a',
                fontSize: '14px',
                height: '28px',
                lineHeight: '28px',
                paddingLeft: '8px',
                paddingRight: '8px',
            }}
        >
            <DollarOutlined style={{ fontSize: '24px', color: '#fff' }} />
        </Badge>
    );
};
