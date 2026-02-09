# Real-Time Auction System - Frontend Integration Guide

## 🌐 Backend Connection Details

### Your Server Address
| Type | Address |
|------|---------|
| **Local Network IP** | `192.168.25.65` |
| **Public IP** | `112.196.81.250` |
| **Port** | `3000` |

### Base URL for API Calls
```
# For same network (your friend on same WiFi)
http://192.168.25.65:3000

# For public access (if port forwarding enabled)
http://112.196.81.250:3000
```

### WebSocket Connection
```javascript
// Socket.IO connection
const socket = io('http://192.168.25.65:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }  // Optional for viewing, required for bidding
});
```

---

## 🔐 Authentication APIs

### 1. Register User
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "balance": "1000.00",
    "createdAt": "2026-02-09T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "balance": "950.00",
    "createdAt": "2026-02-09T12:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 👤 User APIs

### 3. Get Current User Profile
```
GET /api/users/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "balance": "950.00",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "wonAuctions": [
    {
      "id": "uuid",
      "title": "Vintage Watch",
      "currentPrice": "500.00",
      "status": "sold"
    }
  ]
}
```

---

## 🏷️ Auction APIs

### 4. Create Auction
```
POST /api/auctions
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Vintage Watch",
  "description": "Rare 1960s watch in excellent condition",
  "startingPrice": 100,
  "endsAt": "2026-02-10T18:00:00.000Z"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Vintage Watch",
  "description": "Rare 1960s watch in excellent condition",
  "startingPrice": "100.00",
  "currentPrice": "100.00",
  "status": "active",
  "creatorId": "uuid",
  "winnerId": null,
  "endsAt": "2026-02-10T18:00:00.000Z",
  "createdAt": "2026-02-09T12:00:00.000Z"
}
```

---

### 5. List Auctions
```
GET /api/auctions?status=active&page=1&limit=20
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | - | Filter: `draft`, `active`, `sold`, `expired` |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Vintage Watch",
      "currentPrice": "150.00",
      "status": "active",
      "endsAt": "2026-02-10T18:00:00.000Z",
      "createdAt": "2026-02-09T12:00:00.000Z",
      "creator": {
        "id": "uuid",
        "email": "seller@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 6. Get Single Auction
```
GET /api/auctions/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Vintage Watch",
  "description": "Rare 1960s watch",
  "startingPrice": "100.00",
  "currentPrice": "350.00",
  "status": "active",
  "endsAt": "2026-02-10T18:00:00.000Z",
  "createdAt": "2026-02-09T12:00:00.000Z",
  "creator": {
    "id": "uuid",
    "email": "seller@example.com"
  },
  "winner": {
    "id": "uuid",
    "email": "bidder@example.com"
  },
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
  ]
}
```

---

### 7. Place Bid
```
POST /api/auctions/:id/bid
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 175.50
}
```

**Response (201):**
```json
{
  "bid": {
    "id": "uuid",
    "amount": "175.50",
    "bidderId": "uuid",
    "auctionItemId": "uuid",
    "createdAt": "2026-02-09T14:35:00.000Z"
  },
  "auction": {
    "id": "uuid",
    "currentPrice": "175.50",
    "winnerId": "uuid",
    "endsAt": "2026-02-10T18:00:00.000Z"
  }
}
```

**Error Responses:**
```json
// 400 - Bid too low
{ "statusCode": 400, "message": "Bid must be higher than current price: 175.00" }

// 400 - Insufficient balance
{ "statusCode": 400, "message": "Insufficient balance. Required: 200.00, Available: 150.00" }

// 400 - Auction ended
{ "statusCode": 400, "message": "Auction has ended" }
```

---

## 🔌 WebSocket Events

### Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://192.168.25.65:3000', {
  auth: { token: 'YOUR_JWT_TOKEN' }  // Optional
});
```

### Join Auction Room
```javascript
socket.emit('join_auction', { auctionId: 'uuid' });
```

### Leave Auction Room
```javascript
socket.emit('leave_auction', { auctionId: 'uuid' });
```

### Listen for Events
```javascript
// New bid placed
socket.on('NEW_BID', (data) => {
  console.log(data);
  // { bidId, amount, bidderId, currentPrice, endsAt, timestamp }
});

// Auction ending soon (5 min warning)
socket.on('AUCTION_ENDING_SOON', (data) => {
  // { auctionId, endsAt, timestamp }
});

// Auction sold
socket.on('AUCTION_SOLD', (data) => {
  // { auctionId, winnerId, finalPrice, timestamp }
});

// Auction expired (no bids)
socket.on('AUCTION_EXPIRED', (data) => {
  // { auctionId, timestamp }
});

// Viewer count update
socket.on('VIEWER_COUNT', (data) => {
  // { auctionId, count, timestamp }
});

// Current auction state (received on join)
socket.on('AUCTION_STATE', (data) => {
  // Full auction object
});
```

---

## 🩺 Health Check
```
GET /health
```

**Response (200):**
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

## ⚠️ Error Response Format
All errors follow this format:
```json
{
  "statusCode": 400,
  "timestamp": "2026-02-09T12:00:00.000Z",
  "path": "/api/auctions/uuid/bid",
  "method": "POST",
  "message": "Bid must be higher than current price: 175.00"
}
```

---

## 🔧 Important Notes for Frontend

1. **CORS**: Backend allows all origins (`*`), no CORS issues expected
2. **Auth Header Format**: `Authorization: Bearer <token>`
3. **Content-Type**: Always use `Content-Type: application/json`
4. **Prices**: All prices are strings with 2 decimal places (e.g., "100.00")
5. **Dates**: All dates are ISO 8601 format (e.g., "2026-02-09T12:00:00.000Z")
6. **UUIDs**: All IDs are UUID v4 strings

---

## 🔒 Make Backend Accessible

If your friend is on a different network, you need to:

1. **Port Forward** port 3000 on your router to your machine (192.168.25.65)
2. Or use **ngrok** for quick tunneling:
   ```bash
   npx ngrok http 3000
   ```
   This gives you a public URL like `https://abc123.ngrok.io`
