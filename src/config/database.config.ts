import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'auction_user',
    password: process.env.DATABASE_PASSWORD || 'auction_password',
    database: process.env.DATABASE_NAME || 'auction_db',
    synchronize: false, // NEVER use synchronize in production
    logging: process.env.NODE_ENV === 'development',
}));
