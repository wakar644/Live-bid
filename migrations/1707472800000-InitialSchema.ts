import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1707472800000 implements MigrationInterface {
    name = 'InitialSchema1707472800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "balance" numeric(18,2) NOT NULL DEFAULT '0.00',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

        // Create auction_items table
        await queryRunner.query(`
      CREATE TYPE "public"."auction_status_enum" AS ENUM('draft', 'active', 'sold', 'expired')
    `);

        await queryRunner.query(`
      CREATE TABLE "auction_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "startingPrice" numeric(18,2) NOT NULL,
        "currentPrice" numeric(18,2) NOT NULL,
        "status" "public"."auction_status_enum" NOT NULL DEFAULT 'draft',
        "creatorId" uuid NOT NULL,
        "winnerId" uuid,
        "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_auction_items" PRIMARY KEY ("id")
      )
    `);

        // Create bids table
        await queryRunner.query(`
      CREATE TABLE "bids" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "amount" numeric(18,2) NOT NULL,
        "bidderId" uuid NOT NULL,
        "auctionItemId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bids" PRIMARY KEY ("id")
      )
    `);

        // Add foreign keys
        await queryRunner.query(`
      ALTER TABLE "auction_items"
      ADD CONSTRAINT "FK_auction_items_creator"
      FOREIGN KEY ("creatorId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "auction_items"
      ADD CONSTRAINT "FK_auction_items_winner"
      FOREIGN KEY ("winnerId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "bids"
      ADD CONSTRAINT "FK_bids_bidder"
      FOREIGN KEY ("bidderId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "bids"
      ADD CONSTRAINT "FK_bids_auctionItem"
      FOREIGN KEY ("auctionItemId") REFERENCES "auction_items"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

        // Create indexes for performance
        await queryRunner.query(`
      CREATE INDEX "IDX_auction_items_status" ON "auction_items" ("status")
    `);

        await queryRunner.query(`
      CREATE INDEX "IDX_auction_items_endsAt" ON "auction_items" ("endsAt")
    `);

        await queryRunner.query(`
      CREATE INDEX "IDX_bids_auctionItemId" ON "bids" ("auctionItemId")
    `);

        await queryRunner.query(`
      CREATE INDEX "IDX_bids_bidderId" ON "bids" ("bidderId")
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_bids_bidderId"`);
        await queryRunner.query(`DROP INDEX "IDX_bids_auctionItemId"`);
        await queryRunner.query(`DROP INDEX "IDX_auction_items_endsAt"`);
        await queryRunner.query(`DROP INDEX "IDX_auction_items_status"`);
        await queryRunner.query(`ALTER TABLE "bids" DROP CONSTRAINT "FK_bids_auctionItem"`);
        await queryRunner.query(`ALTER TABLE "bids" DROP CONSTRAINT "FK_bids_bidder"`);
        await queryRunner.query(`ALTER TABLE "auction_items" DROP CONSTRAINT "FK_auction_items_winner"`);
        await queryRunner.query(`ALTER TABLE "auction_items" DROP CONSTRAINT "FK_auction_items_creator"`);
        await queryRunner.query(`DROP TABLE "bids"`);
        await queryRunner.query(`DROP TABLE "auction_items"`);
        await queryRunner.query(`DROP TYPE "public"."auction_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
