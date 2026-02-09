import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, AuctionItem, Bid } from '../../entities';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('database.host'),
                port: configService.get('database.port'),
                username: configService.get('database.username'),
                password: configService.get('database.password'),
                database: configService.get('database.database'),
                entities: [User, AuctionItem, Bid],
                synchronize: false,
                logging: configService.get('database.logging'),
                migrations: [__dirname + '/../../migrations/*.{ts,js}'],
                migrationsRun: true,
            }),
        }),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule { }
