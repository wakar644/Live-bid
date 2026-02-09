# Frontend WebSocket Integration Guide

## Problem
After placing a bid, the UI doesn't update until you refresh the page.

## Solution
Listen to the `NEW_BID` socket event to update the UI in real-time.

---

## Complete React Example

```javascript
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function AuctionPage({ auctionId }) {
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Connect to WebSocket
    const newSocket = io('http://192.168.25.65:8080', {
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token') // Optional
      }
    });

    // 2. Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected:', newSocket.id);
      setIsConnected(true);
      
      // Join the auction room
      newSocket.emit('join_auction', { auctionId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected');
      setIsConnected(false);
    });

    // 3. Receive initial auction state
    newSocket.on('AUCTION_STATE', (data) => {
      console.log('📊 Initial State:', data);
      setAuction(data);
      setBids(data.bids || []);
    });

    // 4. ⭐ THIS IS THE KEY - Listen for new bids
    newSocket.on('NEW_BID', (data) => {
      console.log('🔥 NEW BID:', data);
      
      // Update current price
      setAuction(prev => ({
        ...prev,
        currentPrice: data.currentPrice,
        endsAt: data.endsAt // May change due to anti-snipe
      }));

      // Add new bid to the list
      setBids(prev => [{
        id: data.bidId,
        amount: data.amount,
        createdAt: new Date().toISOString(),
        bidder: { id: data.bidderId }
      }, ...prev]);
    });

    // 5. Listen for viewer count
    newSocket.on('VIEWER_COUNT', (data) => {
      console.log('👥 Viewers:', data.count);
      setAuction(prev => ({ ...prev, viewerCount: data.count }));
    });

    // 6. Listen for auction sold
    newSocket.on('AUCTION_SOLD', (data) => {
      console.log('✅ SOLD:', data);
      setAuction(prev => ({
        ...prev,
        status: 'SOLD',
        winnerId: data.winnerId,
        finalPrice: data.finalPrice
      }));
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.emit('leave_auction', { auctionId });
      newSocket.disconnect();
    };
  }, [auctionId]);

  // Function to place a bid
  const placeBid = async (amount) => {
    try {
      const response = await fetch(
        `http://192.168.25.65:8080/api/auctions/${auctionId}/bid`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ amount })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.message);
        return;
      }

      const result = await response.json();
      console.log('Bid placed:', result);
      
      // ⚠️ DON'T manually update state here!
      // The socket will receive NEW_BID event and update automatically
      
    } catch (error) {
      console.error('Bid failed:', error);
      alert('Failed to place bid');
    }
  };

  return (
    <div>
      <div>Status: {isConnected ? '🟢 LIVE' : '🔴 Offline'}</div>
      
      {auction && (
        <>
          <h1>{auction.title}</h1>
          <h2>Current Price: ${auction.currentPrice}</h2>
          <p>Viewers: {auction.viewerCount || 0}</p>
          
          <button onClick={() => placeBid(parseFloat(auction.currentPrice) + 10)}>
            Bid ${parseFloat(auction.currentPrice) + 10}
          </button>

          <h3>Bid History</h3>
          <ul>
            {bids.map(bid => (
              <li key={bid.id}>
                ${bid.amount} - {new Date(bid.createdAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default AuctionPage;
```

---

## Vanilla JavaScript Example

```javascript
// Connect
const socket = io('http://192.168.25.65:8080');

// Join auction
socket.on('connect', () => {
  socket.emit('join_auction', { auctionId: 'YOUR_AUCTION_ID' });
});

// Listen for new bids
socket.on('NEW_BID', (data) => {
  // Update price display
  document.getElementById('current-price').textContent = data.currentPrice;
  
  // Add to bid history
  const bidList = document.getElementById('bid-list');
  const li = document.createElement('li');
  li.textContent = `$${data.amount} - Just now`;
  bidList.prepend(li);
});
```

---

## Key Points

1. **Join the room**: `socket.emit('join_auction', { auctionId })`
2. **Listen to NEW_BID**: This event fires when ANYONE places a bid
3. **Don't manually update after your own bid**: The socket will handle it
4. **The backend already broadcasts**: No changes needed on backend

---

## Debugging

Check browser console for these logs:
```
✅ Connected: abc123
📊 Initial State: { currentPrice: "100.00", ... }
🔥 NEW BID: { amount: "150.00", currentPrice: "150.00", ... }
```

If you don't see `NEW BID` logs, the frontend isn't listening to the event!
