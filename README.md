# Real-Time Auction System Backend

A production-grade backend for a real-time auction platform built with NestJS, featuring concurrent bid handling, escrow-based balance management, and WebSocket support.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│              REST API Clients    WebSocket Clients               │
└────────────────────┬────────────────────┬───────────────────────┘
                     │                    │
┌────────────────────▼────────────────────▼───────────────────────┐
│                     NestJS API Server                            │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────────────┐│
│  │   Auth   │ │  Users   │ │ Auctions  │ │   Socket.IO Gateway ││
│  │  Module  │ │  Module  │ │  Module   │ │   (Real-time)       ││
│  └──────────┘ └──────────┘ └───────────┘ └─────────────────────┘│
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                      Data Layer                                  │
│        ┌──────────────────┐    ┌──────────────────┐            │
│        │   PostgreSQL     │    │      Redis       │            │
│        │   (Persistence)  │    │  (Cache/Queues)  │            │
│        └──────────────────┘    └──────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                   Worker Process                                 │
│              BullMQ Job Processors                               │
│     • Auction Settlement  • Outbid Notifications                 │
│     • Ending Reminders                                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

| Technology | Purpose |
|------------|---------|
| **NestJS** | Backend framework |
| **TypeORM** | Database ORM with migrations |
| **PostgreSQL** | Primary database |
| **Redis** | Caching, BullMQ queues |
| **BullMQ** | Background job processing |
| **Socket.IO** | Real-time WebSocket events |
| **JWT** | Authentication |
| **Docker** | Containerization |

## 📁 Project Structure

```
src/
├── main.ts                 # API entry point
├── worker.ts               # Background worker entry
├── app.module.ts           # Root module
├── entities/               # TypeORM entities
│   ├── user.entity.ts
│   ├── auction-item.entity.ts
│   └── bid.entity.ts
├── modules/
│   ├── auth/               # JWT authentication
│   ├── users/              # User profiles
│   ├── auctions/           # Auction CRUD & bidding
│   ├── bids/               # Bid queries
│   ├── websocket/          # Socket.IO gateway
│   ├── jobs/               # BullMQ processors
│   ├── health/             # Health checks
│   ├── database/           # TypeORM config
│   └── redis/              # Redis client
└── common/
    ├── decorators/         # Custom decorators
    ├── guards/             # Auth guards
    └── filters/            # Exception filters
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Using Docker (Recommended)

```bash
# Clone and navigate to project
cd /data/Live-bid

# Start all services
docker-compose up --build

# Services will be available at:
# - API: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL and Redis (via Docker)
docker-compose up postgres redis -d

# Run migrations
npm run migration:run

# Start development server
npm run start:dev

# Start worker (in separate terminal)
npm run start:worker
```

## 📚 API Documentation

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Auctions

#### Create Auction
```bash
POST /api/auctions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Vintage Watch",
  "description": "Rare 1960s watch",
  "startingPrice": 100.00,
  "endsAt": "2024-02-15T12:00:00Z"
}
```

#### List Auctions
```bash
GET /api/auctions?status=active&page=1&limit=20
```

#### Get Auction Details
```bash
GET /api/auctions/:id
```

#### Place Bid
```bash
POST /api/auctions/:id/bid
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00
}
```

### Users

#### Get Profile
```bash
GET /api/users/me
Authorization: Bearer <token>
```

### Health Check
```bash
GET /health
```

## ⚔️ Concurrency & Locking Strategy

### Decision: Pessimistic Locking (SELECT FOR UPDATE)

We chose **pessimistic locking** over optimistic locking for the following reasons:

| Aspect | Pessimistic | Optimistic |
|--------|-------------|------------|
| **Contention Handling** | Blocks concurrent transactions | Retries on conflict |
| **Consistency** | Guaranteed, immediate | Eventual, may need retries |
| **Throughput** | Lower under low contention | Higher under low contention |
| **Complexity** | Simpler implementation | Requires retry logic |

Under high contention (50+ concurrent bids on same auction), pessimistic locking provides:
- **Guaranteed consistency** - No race conditions possible
- **Simpler error handling** - No retry loops needed
- **Predictable latency** - Transactions queue rather than retry

### Bid Transaction Flow

```
1. BEGIN TRANSACTION
2. SELECT auction FOR UPDATE (lock row)
3. Validate: auction active, not ended, bid > current price
4. SELECT bidder FOR UPDATE (lock user row)
5. Validate: bidder has sufficient balance
6. If previous winner exists:
   - REFUND previous winner's escrowed amount
7. DEDUCT bid amount from new bidder (escrow)
8. UPDATE auction: currentPrice, winnerId
9. Apply anti-snipe extension if needed
10. INSERT bid record
11. COMMIT TRANSACTION
12. EMIT WebSocket event (only after commit!)
```

### Anti-Sniping Logic

If a bid is placed within the final **10 seconds** of an auction, the auction is automatically extended by **30 seconds**. This prevents last-second bid sniping and ensures fair competition.

## 🌐 Real-Time Events (WebSocket)

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' }
});

// Join auction room
socket.emit('join_auction', { auctionId: 'uuid' });

// Listen for events
socket.on('NEW_BID', (data) => {
  console.log('New bid:', data);
});

socket.on('AUCTION_ENDING_SOON', (data) => {
  console.log('Ending soon:', data);
});

socket.on('AUCTION_SOLD', (data) => {
  console.log('Sold:', data);
});

socket.on('VIEWER_COUNT', (data) => {
  console.log('Viewers:', data.count);
});
```

### Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `NEW_BID` | `{ bidId, amount, bidderId, currentPrice, endsAt }` | After bid transaction commits |
| `AUCTION_ENDING_SOON` | `{ auctionId, endsAt }` | 5 minutes before end |
| `AUCTION_SOLD` | `{ winnerId, finalPrice }` | Auction settled with winner |
| `AUCTION_EXPIRED` | `{ auctionId }` | Auction settled, no bids |
| `VIEWER_COUNT` | `{ auctionId, count }` | User join/leave room |
| `AUCTION_STATE` | Full auction object | On room join |

### Event Delivery Guarantees

- Events are emitted **only after** the database transaction commits
- If transaction rolls back, no event is emitted (consistency)
- Viewer counts tracked in Redis for accuracy across reconnects

## ⚙️ Background Jobs

### Job Types

1. **Auction Settlement** - Runs when auction ends
   - Marks auction as `sold` or `expired`
   - Idempotent: checks status before processing

2. **Ending Reminder** - Runs 5 minutes before auction ends
   - Emits `AUCTION_ENDING_SOON` event

3. **Outbid Notification** - Runs when user is outbid
   - Would send email/push notification (logging only in this version)

### Idempotency Approach

All jobs check the current state before processing:

```typescript
async handleSettlement(data: { auctionId: string }) {
  const auction = await findAuction(auctionId);
  
  // Idempotency: Skip if already processed
  if (auction.status === 'sold' || auction.status === 'expired') {
    return; // Already settled
  }
  
  // Process settlement...
}
```

### Retry Configuration

- **Max attempts**: 3
- **Backoff**: Exponential (1s, 2s, 4s)
- **Cleanup**: Completed jobs removed after 1 hour

## 🐳 Docker Configuration

### Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 3000 | Main API server |
| `worker` | - | Background job processor |
| `postgres` | 5432 | Database |
| `redis` | 6379 | Cache & queues |

### Security Features

- Multi-stage builds (smaller images)
- Non-root containers
- Health checks on all services
- Graceful shutdown handling

## 🧪 Running Concurrency Tests

```bash
# Start services
docker-compose up -d

# Wait for services to be healthy
sleep 10

# Run concurrency test
npx ts-node test/test-concurrency.ts
```

### What the Test Validates

1. ✅ Creates 50 users with $1000 balance each
2. ✅ Fires 50 parallel bid requests
3. ✅ **One winner only** - Exactly one user wins
4. ✅ **No negative balances** - Escrow system integrity
5. ✅ **Final price = highest bid** - Price consistency
6. ✅ **Winner's escrow** - Bid amount deducted correctly

## 📝 Trade-offs & Decisions

### Why Pessimistic Locking?

**Pros:**
- Guaranteed consistency under high contention
- No retry storms under load
- Simpler code without retry logic

**Cons:**
- Slightly lower throughput under low contention
- Transactions may wait on locks

**Decision:** For an auction system where data integrity is paramount (money involved), the consistency guarantees of pessimistic locking outweigh the minor throughput concerns.

### Why Separate Worker Process?

**Pros:**
- API process crash doesn't affect job processing
- Independent scaling
- Better resource isolation

**Cons:**
- Additional container to manage
- Slight code duplication

### Why Decimal Strings for Money?

JavaScript's `number` type uses IEEE 754 floats which cannot precisely represent decimal values. Using `decimal(18,2)` in PostgreSQL and string representation in TypeScript ensures:
- No floating-point rounding errors
- Exact monetary calculations
- Compatibility with the `decimal.js` library for operations

## 🔒 Security Considerations

1. **Passwords**: Hashed using bcrypt (10 rounds)
2. **JWT**: Bearer token authentication
3. **CORS**: Configured for production
4. **Input Validation**: class-validator on all DTOs
5. **SQL Injection**: Prevented by TypeORM parameterized queries
6. **Non-root Containers**: Reduced attack surface

## 📋 Available Scripts

```bash
# Development
npm run start:dev          # Start API in dev mode
npm run start:worker       # Start worker in dev mode

# Production
npm run build              # Build for production
npm run start:prod         # Start production build

# Database
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration

# Testing
npm run test               # Unit tests
npm run test:e2e           # E2E tests
npm run test:cov           # Coverage report
```

## 📄 License

MIT
