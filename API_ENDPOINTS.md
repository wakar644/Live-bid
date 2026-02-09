# API Endpoints - Complete Reference

Base URL: `http://192.168.25.65:8080`

## 🔐 Authentication

### 1. Register User
```
POST /api/auth/register
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "balance": "1000.00",
    "createdAt": "2026-02-09T12:00:00.000Z"
  },
  "accessToken": "eyJhbGc..."
}
```

### 2. Login
```
POST /api/auth/login
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response:** Same as register

### 3. Get Profile (NEW) ✨
```
GET /api/auth/profile
Authorization: Bearer <token>
```
**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "balance": "950.00",
  "createdAt": "2026-02-09T12:00:00.000Z"
}
```

---

## 👤 Users

### Get Current User
```
GET /api/users/me
Authorization: Bearer <token>
```
**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "balance": "950.00",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "wonAuctions": [...]
}
```

---

## 🏷️ Auctions

### 1. Create Auction
```
POST /api/auctions
Authorization: Bearer <token>
```
**Request:**
```json
{
  "title": "Vintage Watch",
  "description": "Rare 1960s watch",
  "startingPrice": 100,
  "endsAt": "2026-02-10T18:00:00.000Z"
}
```

### 2. List Auctions
```
GET /api/auctions?status=active&page=1&limit=20
```

### 3. Get Single Auction
```
GET /api/auctions/:id
```

### 4. Get Auction Bids (NEW) ✨
```
GET /api/auctions/:id/bids?limit=20
```
**Response:**
```json
{
  "auctionId": "uuid",
  "bids": [
    {
      "id": "uuid",
      "amount": "350.00",
      "createdAt": "2026-02-09T14:30:00.000Z",
      "bidder": {
        "id": "uuid",
        "email": "bidder@example.com"
      }
    }
  ],
  "total": 15
}
```

### 5. Place Bid
```
POST /api/auctions/:id/bid
Authorization: Bearer <token>
```
**Request:**
```json
{
  "amount": 175.50
}
```

---

## 🩺 Health

```
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "info": {
    "postgres": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

---

## 🔌 WebSocket Events

Connect to: `ws://192.168.25.65:8080`

**Events:**
- `NEW_BID` - New bid placed
- `AUCTION_ENDING_SOON` - 5 min warning
- `AUCTION_SOLD` - Auction completed
- `AUCTION_EXPIRED` - No bids received
- `VIEWER_COUNT` - Active viewers

---

## 📝 Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- Prices are strings with 2 decimal places (e.g., "100.00")
- All IDs are UUID v4 format
- Dates are ISO 8601 format
