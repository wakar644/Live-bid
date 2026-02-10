# LiveBid API Reference - All-in-One Documentation

This document serves as the complete technical reference for the LiveBid system, covering REST APIs, WebSocket events, and integration details.

---

## 🌐 Connection Details

| Attribute | Value |
|-----------|-------|
| **Base URL** | `http://192.168.25.65:3000` |
| **API Prefix** | `/api` |
| **WebSocket** | `ws://192.168.25.65:3000` |
| **Default Port**| `3000` (configurable via `.env`) |

---

## 🔐 Authentication

### 1. Register User
`POST /api/auth/register`
- **Request:** `{"email": "...", "password": "..."}`
- **Response:** `{ "user": { "id", "email", "balance": "0.00", ... }, "accessToken": "..." }`

### 2. Login
`POST /api/auth/login`
- **Request:** `{"email": "...", "password": "..."}`
- **Response:** Same as Register.

---

## 👤 User Activity

All user endpoints require `Authorization: Bearer <token>`.

### 3. Get My Profile
`GET /api/users/me`
- **Response:** Returns current user object including balance and won auctions summary.

### 4. Add Funds (NEW) ✨
`POST /api/users/me/funds`
- **Request:** `{"amount": 100.50}`
- **Response:** `{ "balance": "100.50" }`

### 5. Get My Auctions
`GET /api/users/me/auctions?page=1&limit=20`
- **Response:** Paginated list of auctions created by the user.
```json
{
  "items": [...],
  "pagination": { "total", "page", "limit", "totalPages" }
}
```

### 5. Get My Bids
`GET /api/users/me/bids?page=1&limit=20`
- **Response:** Paginated list of all bids placed by the user.

---

## 🏷️ Auctions

### 6. List Auctions
`GET /api/auctions?status=active&page=1&limit=20`
- **Response:** Paginated list of auctions. Includes `bidCount`.

### 7. Create Auction
`POST /api/auctions` (Auth Required)
- **Request:** `{"title", "description", "startingPrice", "endsAt"}`
- **Note:** End date must be in the future.

### 8. Get Auction Details
`GET /api/auctions/:id`
- **Response:** Full auction object with creator details and last 20 bids.

### 9. Get Winning Bids
`GET /api/auctions/winners`
- **Response:** List of all auctions with status `SOLD` and their winner information.

### 10. Place Bid
`POST /api/auctions/:id/bid` (Auth Required)
- **Request:** `{"amount": 150.50}`
- **Logic:** Atomic check for balance, anti-sniping extension (+30s), and escrow refund.

---

## 🔌 WebSocket Events

### Handshake & Rooms
- **Namespace:** `/`
- **Room:** `auction:{auctionId}` - Join by emitting `join_auction { auctionId }`.

### Outbound Events (Server -> Client)
| Event | Payload | Description |
|-------|---------|-------------|
| `NEW_BID` | `{ amount, bidderName, timestamp, bidderId, endsAt }` | Broadcasted when a valid bid is committed. |
| `AUCTION_ENDING_SOON`| `{ auctionId, secondsRemaining, endsAt, timestamp }` | Sent 5 minutes before scheduled end. |
| `AUCTION_SOLD` | `{ auctionId, winnerName, finalPrice, winnerId, timestamp }` | Sent when settlement job completes. |
| `AUCTION_EXPIRED` | `{ auctionId, timestamp }` | Sent if auction ends without bids. |
| `VIEWER_COUNT` | `{ auctionId, count }` | Real-time active viewer updates. |

---

## 🩺 System
- **Health Check**: `GET /health` - Checks PostgreSQL and Redis status.
- **Graceful Shutdown**: System handles `SIGTERM`/`SIGINT` to protect active transactions.

---

## ⚠️ Notes for Integration
- **Precision**: All monetary values are returned as **Strings** (e.g., `"100.00"`) to avoid float errors.
- **Anti-Sniping**: Bids within the last **10s** extend the auction by **30s**.
- **Locking**: Uses pessimistic row locking; high-frequency parallel bidding is handled safely.
- **Errors**: Follow standard RFC 7807 problem details (contains `statusCode`, `message`, `path`).
