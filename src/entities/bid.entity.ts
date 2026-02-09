import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AuctionItem } from './auction-item.entity';

@Entity('bids')
export class Bid {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('decimal', { precision: 18, scale: 2 })
    amount: string;

    @Column('uuid')
    bidderId: string;

    @ManyToOne(() => User, (user) => user.bids)
    @JoinColumn({ name: 'bidderId' })
    bidder: User;

    @Column('uuid')
    auctionItemId: string;

    @ManyToOne(() => AuctionItem, (auction) => auction.bids)
    @JoinColumn({ name: 'auctionItemId' })
    auctionItem: AuctionItem;

    @CreateDateColumn()
    createdAt: Date;
}
