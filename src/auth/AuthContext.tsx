import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types/auth';
import { authApi } from '../api/auth.api';
import { connectSocket, disconnectSocket } from '../sockets/socket';
import { notification } from 'antd';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            console.log('Loading user profile...');
            const userData = await authApi.getProfile();
            console.log('User profile loaded:', userData);
            setUser(userData);
            const token = localStorage.getItem('token');
            if (token) {
                console.log('Connecting socket...');
                connectSocket(token);
            }
        } catch (error: any) {
            console.error('Failed to load user:', error);
            // Only clear session on authentication errors (401)
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                notification.error({
                    message: 'Session Expired',
                    description: 'Please log in again.',
                });
            }
            // Keep token for other errors (network issues, server errors, etc.)
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: LoginRequest) => {
        try {
            const response = await authApi.login(credentials);
            localStorage.setItem('token', response.accessToken);
            setUser(response.user);
            connectSocket(response.accessToken);
            notification.success({
                message: 'Login Successful',
                description: `Welcome back, ${response.user.username}!`,
            });
        } catch (error: any) {
            notification.error({
                message: 'Login Failed',
                description: error.response?.data?.message || 'Invalid credentials',
            });
            throw error;
        }
    };

    const register = async (data: RegisterRequest) => {
        try {
            const response = await authApi.register(data);
            localStorage.setItem('token', response.accessToken);
            setUser(response.user);
            connectSocket(response.accessToken);
            notification.success({
                message: 'Registration Successful',
                description: `Welcome, ${response.user.username}!`,
            });
        } catch (error: any) {
            notification.error({
                message: 'Registration Failed',
                description: error.response?.data?.message || 'Failed to create account',
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (error) {
            // Ignore logout errors
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            disconnectSocket();
            notification.info({
                message: 'Logged Out',
                description: 'You have been logged out successfully.',
            });
        }
    };

    const refreshUser = async () => {
        try {
            const userData = await authApi.getProfile();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};
