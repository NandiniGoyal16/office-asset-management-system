# Execution & Deployment Guide
## AssetFlow Pro - Office Asset Management System
**Target Audience:** Students, Instructors, DevOps Engineers, and System Evaluators  

---

## 1. Quick Local Execution (Turnkey)

### Prerequisites
- Node.js v18+ or v20+ or v22+ installed.
- That's all! SQLite is embedded and auto-configured with zero external database server installations required.

### 1-Command Startup
Open your terminal inside the project directory (`office-asset-management`):

```bash
# 1. Install dependencies (instant, ~5 seconds)
npm install

# 2. Run automated test suite (verifies all APIs, math & lifecycles)
npm test

# 3. Launch the application
npm start
```

### Accessing the Web Application
Open your browser and navigate to:
```
http://localhost:3000
```
The database will automatically initialize its schema and seed 12 enterprise assets, 8 cross-department employees, 6 active custody records, and maintenance history on the first launch!

---

## 2. Docker & Containerized Deployment

AssetFlow Pro comes preconfigured with a multi-stage `Dockerfile` and `docker-compose.yml` for isolated container execution.

### Using Docker Compose (Recommended)
```bash
# Build and start container in detached background mode
docker-compose up -d --build

# Inspect logs
docker-compose logs -f

# Stop container
docker-compose down
```

### Data Persistence in Docker
Two dedicated named Docker volumes ensure that your asset database and uploaded files survive container upgrades:
- `asset_data`: Mounts to `/app/data` (stores `assets.db`, `assets.db-wal`, `assets.db-shm`).
- `asset_uploads`: Mounts to `/app/public/uploads` (stores uploaded asset receipts and photos).

---

## 3. Free Cloud Deployment Options

You can easily deploy AssetFlow Pro to popular cloud platforms for live evaluation demonstrations:

### Option A: Render.com (Free Web Service)
1. Push this repository to GitHub or GitLab.
2. Sign in to [Render.com](https://render.com) and click **New + > Web Service**.
3. Select your repository.
4. Set configuration:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Port:** `3000` (or leave default, Render injects `PORT`)
5. Click **Deploy Web Service**. Render provides a free `https://your-project.onrender.com` URL in 2 minutes!

### Option B: Railway.app (Free Tier)
1. Go to [Railway.app](https://railway.app).
2. Click **New Project > Deploy from GitHub repo**.
3. Select this repository.
4. Railway detects Node.js and executes `npm install` and `npm start` automatically.
5. In project settings, add a persistent volume mounted at `/app/data` to retain the SQLite database.

### Option C: Fly.io
```bash
# Install Fly CLI and launch
fly launch
fly volumes create asset_data --size 1
fly deploy
```

---

## 4. Environment Variables Configuration

| Variable | Default | Purpose |
|:---------|:--------|:--------|
| `PORT` | `3000` | Port on which the HTTP server listens |
| `NODE_ENV` | `development` | Set to `production` in live deployments |

---

## 5. Database Backup & Disaster Recovery

Because AssetFlow Pro uses SQLite with Write-Ahead Logging (WAL), performing a hot, live database backup is as simple as copying the `data/assets.db` file or running:

```bash
# Hot backup command
sqlite3 data/assets.db ".backup data/assets_backup_$(date +%F).db"
```
To restore, simply place the backup file as `data/assets.db` and start the server.
