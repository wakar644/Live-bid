# LiveBid Frontend

A real-time auction platform frontend built with React, TypeScript, and Vite.

## Features

- **Authentication**: JWT-based login and registration
- **Real-time Updates**: WebSocket integration using Socket.IO for live auction updates
- **Auction Management**: Browse, filter, and view detailed auction information
- **Live Bidding**: Place bids with real-time validation and balance updates
- **Viewer Count**: See live viewer counts for each auction
- **Type-Safe**: Full TypeScript support for reliable development

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Ant Design
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client
- **Routing**: React Router v6

## Prerequisites

- Node.js >= 18
- npm

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

## Build

```bash
# Build for production
npm run build
```

## Project Structure

```
src/
├── api/                    # API client and endpoints
│   ├── axios.ts           # Axios instance with JWT interceptors
│   ├── auth.api.ts        # Authentication API methods
│   └── auctions.api.ts    # Auctions API methods
├── auth/                   # Authentication context and guards
│   ├── AuthContext.tsx    # Global auth state management
│   └── ProtectedRoute.tsx # Route protection component
├── components/             # Reusable components
│   ├── AppLayout.tsx      # Main application layout
│   ├── BalanceBadge.tsx   # User balance display
│   └── BidForm.tsx        # Bid placement form
├── pages/                  # Page components
│   ├── Login.tsx          # Login page
│   ├── Register.tsx       # Registration page
│   ├── AuctionList.tsx    # Auction listing with filters
│   └── AuctionDetail.tsx  # Detailed auction view with bidding
├── sockets/                # WebSocket management
│   └── socket.ts          # Socket.IO client setup
├── types/                  # TypeScript type definitions
│   ├── auth.ts            # Auth-related types
│   ├── auction.ts         # Auction and bid types
│   └── socket.ts          # Socket event types
├── utils/                  # Utility functions
│   └── time.ts            # Time formatting utilities
├── App.tsx                 # Main app component with routing
└── main.tsx                # Application entry point
```

## Key Features

### Authentication Flow
- JWT tokens stored in localStorage
- Automatic token attachment to all API requests via Axios interceptors
- Socket.IO authentication using JWT in handshake
- Protected routes redirect to login if unauthenticated

### Real-time Socket Events
The application handles the following WebSocket events:

- `NEW_BID`: Triggers auction data refresh
- `AUCTION_ENDING_SOON`: Notifies when auction is about to end
- `AUCTION_SOLD`: Updates auction status when sold
- `AUCTION_EXPIRED`: Updates auction status when expired
- `VIEWER_COUNT`: Updates live viewer count

### Data Flow
- **REST API is the source of truth**: All state mutations go through the REST API
- **WebSocket events trigger refreshes**: Socket events don't mutate state directly; they trigger re-fetches
- **Reconnection handling**: On socket reconnect, auction data is automatically refreshed
- **No optimistic UI**: Bidding and balance updates wait for server confirmation

## Error Handling

- API errors are displayed using Ant Design notifications
- Failed bids show specific error messages from the backend
- Expired auctions prevent bid submission
- Balance validation happens server-side

## Notes

- The application requires a running backend server
- Configure `VITE_API_BASE_URL` and `VITE_WS_URL` to point to your backend
- JWT tokens are refreshed automatically through the AuthContext
- User balance is updated after successful bids via profile refresh
