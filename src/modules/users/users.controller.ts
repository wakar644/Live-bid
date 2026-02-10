import {
    Controller,
    Get,
    UseGuards,
    NotFoundException,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
    Post,
    Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities';

import { AddFundsDto } from './dto/add-funds.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    async getProfile(@CurrentUser() user: User) {
        const profile = await this.usersService.getProfile(user.id);

        if (!profile) {
            throw new NotFoundException('User not found');
        }

        return profile;
    }

    @Post('me/funds')
    async addFunds(@CurrentUser() user: User, @Body() dto: AddFundsDto) {
        return this.usersService.addFunds(user.id, dto.amount);
    }

    @Get('me/auctions')
    async getMyAuctions(
        @CurrentUser() user: User,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.usersService.getMyAuctions(user.id, page, limit);
    }

    @Get('me/bids')
    async getMyBids(
        @CurrentUser() user: User,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.usersService.getMyBids(user.id, page, limit);
    }
}
