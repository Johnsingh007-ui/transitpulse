# 🚀 Quick Start Guide - Fixing HTTP 401 Error

## The Issue
HTTP 401 error means the backend isn't running or there's a connection issue between frontend and backend.

## ✅ Quick Fix - Run This Script:

```bash
cd /workspaces/transitpulse
./start_transitpulse.sh
```

## 📝 Manual Steps (if script doesn't work):

### Step 1: Start Database
```bash
cd /workspaces/transitpulse
docker-compose up -d
```

### Step 2: Start Backend 
```bash
cd transitpulse-backend
python main.py
```
**Wait for**: `Server running on http://0.0.0.0:9002`

### Step 3: Start Frontend (NEW TERMINAL)
```bash
cd transitpulse-frontend  
npm run dev
```
**Wait for**: `Local: http://localhost:3002`

## 🌐 Access Points:

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:9002
- **API Docs**: http://localhost:9002/docs

## 🔧 Troubleshooting:

### If ports are busy:
```bash
# Kill existing processes
pkill -f "python main.py"
pkill -f "npm run dev"

# Check what's using ports
lsof -i :9002
lsof -i :3002
```

### If backend won't start:
```bash
cd transitpulse-backend
pip install -r requirements.txt
python test_db_connection.py
```

### If frontend shows 401:
1. Make sure backend is running at port 9002
2. Test backend directly: `curl http://localhost:9002/api/v1/test`
3. Check vite.config.ts proxy settings

## 🎯 Testing the Schedule Feature:

Once running at http://localhost:3002:
1. Click **📅 Schedules** tab
2. Select a route (like Route 101)
3. Pick a date from dropdown
4. Try different view modes (Schedule/Real-time/Comparison)

The 401 error should be resolved once both backend (9002) and frontend (3002) are running properly!
