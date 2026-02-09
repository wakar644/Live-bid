/**
 * Concurrency Test Script for Real-Time Auction System
 * 
 * This script tests the system's ability to handle 50+ concurrent bids
 * on a single auction while maintaining data integrity.
 * 
 * Usage:
 *   npx ts-node test/test-concurrency.ts
 * 
 * Prerequisites:
 *   - API server running on http://localhost:3000
 *   - PostgreSQL and Redis running
 */

import Decimal from 'decimal.js';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const NUM_USERS = 50;
const STARTING_BALANCE = '1000.00';
const STARTING_PRICE = 100;
const BID_INCREMENT = 10;

interface User {
    id: string;
    email: string;
    token: string;
    balance: string;
}

interface Auction {
    id: string;
    currentPrice: string;
    winnerId: string;
    endsAt: string;
}

async function request(
    endpoint: string,
    options: RequestInit = {},
): Promise<any> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
}

async function registerUser(email: string, password: string): Promise<User> {
    try {
        const data = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        return {
            id: data.user.id,
            email: data.user.email,
            token: data.accessToken,
            balance: data.user.balance,
        };
    } catch (error: any) {
        // User might already exist, try login
        if (error.message.includes('already registered')) {
            const loginData = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            return {
                id: loginData.user.id,
                email: loginData.user.email,
                token: loginData.accessToken,
                balance: loginData.user.balance,
            };
        }
        throw error;
    }
}

async function createAuction(
    token: string,
    title: string,
    startingPrice: number,
    durationSeconds: number,
): Promise<Auction> {
    const endsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

    const data = await request('/api/auctions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            title,
            description: 'Concurrency test auction',
            startingPrice,
            endsAt,
        }),
    });

    return {
        id: data.id,
        currentPrice: data.currentPrice,
        winnerId: data.winnerId,
        endsAt: data.endsAt,
    };
}

async function placeBid(
    token: string,
    auctionId: string,
    amount: number,
): Promise<{ success: boolean; message?: string }> {
    try {
        await request(`/api/auctions/${auctionId}/bid`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount }),
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

async function getAuction(auctionId: string): Promise<any> {
    return request(`/api/auctions/${auctionId}`);
}

async function getUserProfile(token: string): Promise<any> {
    return request('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
}

async function runConcurrencyTest() {
    console.log('🚀 Starting Concurrency Test\n');
    console.log('='.repeat(60));
    console.log(`Creating ${NUM_USERS} users and firing ${NUM_USERS} parallel bids`);
    console.log('='.repeat(60));

    // Step 1: Create admin user and auction
    console.log('\n📝 Step 1: Creating admin user and auction...');
    const adminUser = await registerUser('admin@test.com', 'password123');
    console.log(`   Admin user created: ${adminUser.email} (${adminUser.id})`);

    const auction = await createAuction(
        adminUser.token,
        'Concurrency Test Auction',
        STARTING_PRICE,
        300, // 5 minutes
    );
    console.log(`   Auction created: ${auction.id}`);
    console.log(`   Starting price: $${STARTING_PRICE}`);
    console.log(`   Ends at: ${auction.endsAt}`);

    // Step 2: Create test users
    console.log(`\n👥 Step 2: Creating ${NUM_USERS} test users...`);
    const users: User[] = [];
    const createUsersStart = Date.now();

    for (let i = 1; i <= NUM_USERS; i++) {
        const user = await registerUser(`user${i}@test.com`, 'password123');
        users.push(user);
        process.stdout.write(`\r   Created ${i}/${NUM_USERS} users`);
    }
    console.log(`\n   Time: ${Date.now() - createUsersStart}ms`);

    // Step 3: Fire concurrent bids
    console.log('\n⚡ Step 3: Firing concurrent bids...');
    const bidPromises: Promise<{ userId: string; success: boolean; amount: number; message?: string }>[] = [];
    const bidsStart = Date.now();

    // Each user bids a different amount (increasing by BID_INCREMENT each)
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const bidAmount = STARTING_PRICE + (i + 1) * BID_INCREMENT;

        bidPromises.push(
            placeBid(user.token, auction.id, bidAmount).then((result) => ({
                userId: user.id,
                success: result.success,
                amount: bidAmount,
                message: result.message,
            })),
        );
    }

    const bidResults = await Promise.all(bidPromises);
    const bidsDuration = Date.now() - bidsStart;

    const successfulBids = bidResults.filter((r) => r.success);
    const failedBids = bidResults.filter((r) => !r.success);

    console.log(`   Time: ${bidsDuration}ms`);
    console.log(`   Successful bids: ${successfulBids.length}`);
    console.log(`   Failed bids: ${failedBids.length}`);

    // Step 4: Analyze results
    console.log('\n📊 Step 4: Analyzing results...');

    // Get final auction state
    const finalAuction = await getAuction(auction.id);
    console.log(`   Final price: $${finalAuction.currentPrice}`);
    console.log(`   Winner ID: ${finalAuction.winner?.id || 'None'}`);
    console.log(`   Total bids recorded: ${finalAuction.bids.length}`);

    // Get all user balances
    let totalBalance = new Decimal(0);
    let negativeBalances = 0;
    let escrowedAmount = new Decimal(0);

    for (const user of users) {
        const profile = await getUserProfile(user.token);
        const balance = new Decimal(profile.balance);
        totalBalance = totalBalance.plus(balance);

        if (balance.lt(0)) {
            negativeBalances++;
            console.log(`   ⚠️  Negative balance found: ${user.email} has $${profile.balance}`);
        }

        // If this user is the winner, their balance should be STARTING_BALANCE - bidAmount
        if (profile.id === finalAuction.winner?.id) {
            escrowedAmount = new Decimal(STARTING_BALANCE).minus(balance);
        }
    }

    // Get admin balance (should be unchanged)
    const adminProfile = await getUserProfile(adminUser.token);

    // Step 5: Assertions
    console.log('\n✅ Step 5: Running assertions...');
    let allPassed = true;

    // Assertion 1: Only one winner
    const winnerCount = finalAuction.winner?.id ? 1 : 0;
    const oneWinnerPassed = winnerCount === 1 || (winnerCount === 0 && successfulBids.length === 0);
    console.log(`   ${oneWinnerPassed ? '✓' : '✗'} Only one winner: ${winnerCount === 1 ? 'YES' : 'NO'}`);
    allPassed = allPassed && oneWinnerPassed;

    // Assertion 2: No negative balances
    const noNegativePassed = negativeBalances === 0;
    console.log(`   ${noNegativePassed ? '✓' : '✗'} No negative balances: ${negativeBalances === 0 ? 'YES' : `NO (${negativeBalances} found)`}`);
    allPassed = allPassed && noNegativePassed;

    // Assertion 3: Final price equals highest bid
    const expectedHighestBid = STARTING_PRICE + NUM_USERS * BID_INCREMENT;
    const highestSuccessfulBid = Math.max(...successfulBids.map(b => b.amount));
    const priceMatchesBid = new Decimal(finalAuction.currentPrice).eq(highestSuccessfulBid) || finalAuction.currentPrice === auction.currentPrice;
    console.log(`   ${priceMatchesBid ? '✓' : '✗'} Final price matches highest successful bid: ${priceMatchesBid ? 'YES' : 'NO'}`);
    console.log(`     Expected highest bid: $${expectedHighestBid}`);
    console.log(`     Actual highest successful bid: $${highestSuccessfulBid}`);
    console.log(`     Final auction price: $${finalAuction.currentPrice}`);
    allPassed = allPassed && priceMatchesBid;

    // Assertion 4: Winner exists and has escrowed amount
    const winnerBalanceCorrect = escrowedAmount.eq(finalAuction.currentPrice);
    console.log(`   ${winnerBalanceCorrect ? '✓' : '✗'} Winner's escrowed amount matches: ${winnerBalanceCorrect ? 'YES' : 'NO'}`);
    allPassed = allPassed && winnerBalanceCorrect;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(60));

    // Performance stats
    console.log('\n📈 Performance Statistics:');
    console.log(`   Total test duration: ${Date.now() - createUsersStart}ms`);
    console.log(`   Concurrent bid throughput: ${(successfulBids.length / (bidsDuration / 1000)).toFixed(2)} bids/sec`);

    // Failure analysis
    if (failedBids.length > 0) {
        console.log('\n📋 Failed Bid Reasons:');
        const reasons = new Map<string, number>();
        for (const bid of failedBids) {
            const reason = bid.message || 'Unknown';
            reasons.set(reason, (reasons.get(reason) || 0) + 1);
        }
        for (const [reason, count] of reasons) {
            console.log(`   - ${reason}: ${count}`);
        }
    }

    process.exit(allPassed ? 0 : 1);
}

// Run the test
runConcurrencyTest().catch((error) => {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
});
