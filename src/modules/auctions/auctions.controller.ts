import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Query,
    UseGuards,
    ParseUUIDPipe,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, PlaceBidDto, ListAuctionsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, Public } from '../../common/decorators';
import { User } from '../../entities';
import { BidsService } from '../bids/bids.service';

@Controller('auctions')
export class AuctionsController {
    constructor(
        private readonly auctionsService: AuctionsService,
        private readonly bidsService: BidsService,
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@CurrentUser() user: User, @Body() dto: CreateAuctionDto) {
        return this.auctionsService.create(user.id, dto);
    }

    @Get()
    @Public()
    async findAll(@Query() query: ListAuctionsDto) {
        return this.auctionsService.findAll(query);
    }

    @Get('winners')
    @Public()
    async getWinners() {
        return this.auctionsService.findWinners();
    }

    @Get(':id')
    @Public()
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.auctionsService.findOne(id);
    }

    @Get(':id/bids')
    @Public()
    async getBids(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        const bids = await this.bidsService.findByAuctionId(id, limit);
        return {
            auctionId: id,
            bids: bids.map((bid) => ({
                id: bid.id,
                amount: bid.amount,
                createdAt: bid.createdAt,
                bidder: bid.bidder
                    ? { id: bid.bidder.id, email: bid.bidder.email }
                    : null,
            })),
            total: bids.length,
        };
    }

    @Post(':id/bid')
    @UseGuards(JwtAuthGuard)
    async placeBid(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: User,
        @Body() dto: PlaceBidDto,
    ) {
        const result = await this.auctionsService.placeBid(id, user.id, dto);
        return {
            message: 'Bid placed successfully',
            bid: {
                id: result.bid.id,
                amount: result.bid.amount,
                createdAt: result.bid.createdAt,
            },
            auction: {
                currentPrice: result.auction.currentPrice,
                endsAt: result.auction.endsAt,
            },
        };
    }
}
