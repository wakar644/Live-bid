# 🚀 Quick Start - Frontend Connection Guide

## ✅ Backend is Running on PORT 8080

Your backend is accessible at:
```
http://192.168.25.65:8080
```

> **NOTE:** We switched to port **8080** to bypass firewall issues with port 3000.

---

## 🔗 Connect from Frontend

### Base URL
```javascript
const API_BASE_URL = 'http://192.168.25.65:8080';
```

### WebSocket Connection
```javascript
import { io } from 'socket.io-client';

const socket = io('http://192.168.25.65:8080', {
  auth: { 
    token: yourJwtToken  // Optional for viewing
  }
});
```

---

## 🧪 Test the Connection

```bash
# From your friend's machine
curl http://192.168.25.65:8080/health

# Expected response:
# {"status":"ok","info":{"postgres":{"status":"up"},"redis":{"status":"up"}},...}
```

---

## 📌 Quick API Examples

### 1. Register User
```bash
curl -X POST http://192.168.25.65:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Login
```bash
curl -X POST http://192.168.25.65:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. List Auctions
```bash
curl http://192.168.25.65:8080/api/auctions
```

---

## 📚 Full API Documentation

See `API_DOCUMENTATION.md` for complete endpoint details.

---

## ⚠️ Important Notes

1. **Same Network Required**: Your friend must be on the same WiFi/LAN
2. **Keep Server Running**: Don't close the terminal running `npm run start:dev`

---

## 🛑 If Not On Same Network

Use **ngrok** for public access:
```bash
npx ngrok http 8080
```
