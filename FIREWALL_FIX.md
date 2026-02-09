# 🔥 Firewall Configuration - URGENT FIX

## Problem
Your friend gets `ETIMEDOUT` when accessing `http://192.168.25.65:3000`

This means **your firewall is blocking port 3000**.

---

## ✅ Solution: Open Port 3000

### Option 1: UFW (Ubuntu/Debian)
```bash
sudo ufw allow 3000/tcp
sudo ufw status
```

### Option 2: firewalld (Fedora/RHEL/CentOS)
```bash
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

### Option 3: iptables (Manual)
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -L -n | grep 3000
```

### Option 4: Disable Firewall Temporarily (Testing Only)
```bash
# Ubuntu/Debian
sudo ufw disable

# Fedora/RHEL
sudo systemctl stop firewalld
```

---

## 🧪 Test After Opening Port

```bash
# From your machine
curl http://192.168.25.65:3000/health

# From your friend's machine
curl http://192.168.25.65:3000/health
```

---

## ⚠️ Alternative: Use ngrok (No Firewall Changes)

If you can't modify firewall settings:

```bash
# Install and run ngrok
npx ngrok http 3000
```

You'll get a public URL like:
```
https://abc123.ngrok.io
```

Share this URL with your friend - it works from anywhere!

---

## 🔍 Verify Server is Listening

Check the server is listening on all interfaces:
```bash
netstat -tlnp | grep 3000
# Should show: :::3000 (listening on all interfaces)
```

---

## ✅ Current Status

- ✅ Server running: `npm run start:dev`
- ✅ Listening on: `:::3000` (all interfaces)
- ✅ Docker containers: PostgreSQL & Redis running
- ❌ Firewall: **BLOCKING** port 3000 (needs to be opened)
