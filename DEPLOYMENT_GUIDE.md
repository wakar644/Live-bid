# 🚀 AWS EC2 Deployment Guide - LiveBid

Follow these steps to deploy the LiveBid backend to your AWS EC2 instance using Docker.

## 📋 Pre-requisites

You must have these installed on your EC2 instance (Ubuntu/Amazon Linux):

1. **Docker**:
   ```bash
   # For Ubuntu
   sudo apt update && sudo apt install -y docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER # Logout and login after this
   ```

2. **Docker Compose**:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

---

## 🛠️ Step 1: Environment Setup

1. **Create the `.env` file**:
   Since you've cloned the repo, you'll see a `.env.example`. Create your production `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`**:
   Ensure you set a strong `JWT_SECRET`:
   ```bash
   nano .env
   # Update JWT_SECRET and any other ports if necessary
   ```

---

## 🏗️ Step 2: Build & Start (Recommended)

Using **Docker Compose** is the easiest way as it starts the API, Worker, PostgreSQL, and Redis all at once.

```bash
# Build and start in detached mode (background)
docker-compose up --build -d
```

### 🔍 Verification
Check if containers are running:
```bash
docker-compose ps
```

Check logs:
```bash
docker-compose logs -f api
```

---

## ☁️ Step 3: AWS Security Group Configuration

To make the API accessible from the internet, you must open ports in your **AWS Console**:

1. Go to **EC2 Dashboard** -> **Instances**.
2. Select your instance -> **Security** tab -> Click on the **Security Groups**.
3. **Inbound Rules** -> **Edit Inbound Rules**:
   - **Custom TCP** | Port `3000` | Source `0.0.0.0/0` (For API)
   - **Custom TCP** | Port `8080` | Source `0.0.0.0/0` (If you used 8080)
   - **SSH** | Port `22` | (Already there for your PEM file)

---

## 🔄 Updating the Code

When you make changes or pull new code:

```bash
git pull origin main
docker-compose up --build -d
```

---

## 🗄️ Database Management

To run migrations inside the running container:
```bash
docker-compose exec api npm run migration:run
```

---

## 💡 Troubleshooting

- **Container failed to start?** Check logs: `docker-compose logs`
- **Port already in use?** Find and kill: `sudo lsof -i :3000`
- **Memory issues?** Make sure your instance (e.g., t2.micro) has at least 1GB - 2GB RAM. If it's t2.micro (1GB), you might need to add a **Swap File**.
