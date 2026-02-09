import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuctionGateway } from './auction.gateway';
import { AuctionsModule } from '../auctions/auctions.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [
        RedisModule,
        forwardRef(() => AuctionsModule),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get('jwt.expiresIn'),
                },
            }),
        }),
    ],
    providers: [AuctionGateway],
    exports: [AuctionGateway],
})
export class WebSocketModule { }
