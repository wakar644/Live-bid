import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.example' });

export default new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'auction_user',
    password: process.env.DATABASE_PASSWORD || 'auction_password',
    database: process.env.DATABASE_NAME || 'auction_db',
    entities: ['src/entities/*.ts'],
    migrations: ['migrations/*.ts'],
    synchronize: false,
});
