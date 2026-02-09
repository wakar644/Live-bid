# Real-Time Auction System - Project Structure

This project is a high-performance backend for a real-time auction platform, built with **NestJS**, **PostgreSQL**, **Redis**, and **Socket.IO**. It handles user authentication, auction creation, concurrent bidding, and automatic settlement.

## 🏗️ Core Folder Structure (`src/`)

### 1. `config/` (Configuration)
- **Purpose**: Manage environment variables and configuration settings.
- **Files**:
  - `database.config.ts`: PostgreSQL connection settings.
  - `redis.config.ts`: Redis connection settings for caching and queues.
  - `jwt.config.ts`: Secret keys and expiration times for authentication.

### 2. `entities/` (Database Models)
- **Purpose**: Define the database schema using TypeORM.
- **Files**:
  - `user.entity.ts`: Stores user data (email, password hash, balance).
  - `auction-item.entity.ts`: Stores auction details (title, price, status, end time).
  - `bid.entity.ts`: Records individual bids linked to users and auctions.

### 3. `modules/` (Feature Modules)
This is where the business logic lives, separated by domain.

#### A. `auth/` (Authentication)
- **Purpose**: Handle user registration and login.
- **Key Logic**: Uses JWT (JSON Web Tokens) for stateless authentication.
- **Flow**: User logs in -> Server issues JWT -> User sends JWT in header for protected routes.

#### B. `users/` (User Management)
- **Purpose**: Manage user profiles and balances.
- **Key Logic**: Handles retrieving user details and balance verification.

#### C. `auctions/` (Auction Management - THE CORE)
- **Purpose**: CREATE, READ, and UPDATE auctions.
- **Critical Logic (`auctions.service.ts`)**:
  - **Pessimistic Locking**: `lock: { mode: 'pessimistic_write' }` prevents race conditions when multiple users bid simultaneously.
  - **Bid Validation**: Checks balance, auction status, and if bid is higher than current price.
  - **Escrow**: Deducts balance immediately upon bidding and refunds previous highest bidder.
  - **Anti-Sniping**: Extends auction time if a bid is placed in the last seconds.

#### D. `bids/` (Bid History)
- **Purpose**: Retrieve bid history for an auction.

#### E. `websocket/` (Real-Time Updates)
- **Purpose**: Push live updates to frontend without refreshing.
- **Key Logic (`auction.gateway.ts`)**: Emits events like `new_bid` or `auction_ended` to all connected clients.

#### F. `jobs/` (Background Tasks)
- **Purpose**: Handle scheduled tasks.
- **Key Logic (`jobs.service.ts`)**: Uses BullMQ (Redis) to schedule auction settlement when time expires.

### 4. `common/` (Shared Utilities)
- **Purpose**: Reusable code across modules.
- **Files**:
  - `decorators/`: Custom decorators like `@CurrentUser()` to get logged-in user.
  - `guards/`: Security guards like `JwtAuthGuard` to protect routes.

---

## 🚀 How It Works Flow

1. **User Action**: User places a bid on an auction.
2. **API Request**: `POST /api/auctions/:id/bid` hits the `AuctionsController`.
3. **Database Transaction**:
   - Locks the auction row (pessimistic lock).
   - Checks user balance and auction status.
   - Deducts user balance (Escrow).
   - Refunds previous winner (if any).
   - Updates auction price and winner.
   - Saves new bid record.
   - **Commits Transaction**.
4. **Real-Time Update**: `AuctionGateway` broadcasts `new_bid` event to all users viewing that auction.
5. **Background Job**: If auction time extended (anti-sniping), `JobsService` reschedules the settlement job.

---

## 🛠️ Network Configuration

Since the firewall is removed, the system is configured to be accessible on your local network:

- **Port**: `8080` (Changed from 3000 to avoid common firewall blocks)
- **Listen Address**: `0.0.0.0` (Listens on all network interfaces)
- **LAN Access**: `http://192.168.25.65:8080`

You can connect your frontend directly to this IP address.
