import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    VersionColumn,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Bid } from './bid.entity';

export enum AuctionStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    SOLD = 'sold',
    EXPIRED = 'expired',
}

@Entity('auction_items')
export class AuctionItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('decimal', { precision: 18, scale: 2 })
    startingPrice: string;

    @Column('decimal', { precision: 18, scale: 2 })
    currentPrice: string;

    @Column({
        type: 'enum',
        enum: AuctionStatus,
        default: AuctionStatus.DRAFT,
    })
    status: AuctionStatus;

    @Column('uuid')
    creatorId: string;

    @ManyToOne(() => User, (user) => user.createdAuctions)
    @JoinColumn({ name: 'creatorId' })
    creator: User;

    @Column('uuid', { nullable: true })
    winnerId: string;

    @ManyToOne(() => User, (user) => user.wonAuctions, { nullable: true })
    @JoinColumn({ name: 'winnerId' })
    winner: User;

    @Column('timestamp with time zone')
    endsAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @VersionColumn()
    version: number;

    @OneToMany(() => Bid, (bid) => bid.auctionItem)
    bids: Bid[];
}
