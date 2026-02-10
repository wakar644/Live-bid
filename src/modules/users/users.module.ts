import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, AuctionItem, Bid } from '../../entities';

@Module({
    imports: [TypeOrmModule.forFeature([User, AuctionItem, Bid])],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
