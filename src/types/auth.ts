export interface User {
    id: string;
    email: string;
    username: string;
    balance: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}
