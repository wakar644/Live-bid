import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import { Bid } from './bid.entity';
import { AuctionItem } from './auction-item.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    passwordHash: string;

    @Column('decimal', { precision: 18, scale: 2, default: '0.00' })
    balance: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Bid, (bid) => bid.bidder)
    bids: Bid[];

    @OneToMany(() => AuctionItem, (auction) => auction.creator)
    createdAuctions: AuctionItem[];

    @OneToMany(() => AuctionItem, (auction) => auction.winner)
    wonAuctions: AuctionItem[];
}
