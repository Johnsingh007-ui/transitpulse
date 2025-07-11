# 🚨 STEP-BY-STEP MANUAL STARTUP GUIDE

## The "This page isn't working" error means the services aren't running. Let's fix this step by step:

### ⚡ OPTION 1: Simple Manual Startup

**Open 3 separate terminal windows/tabs and run these commands:**

#### Terminal 1 - Database:
```bash
cd /workspaces/transitpulse
docker-compose up -d
docker-compose ps  # Should show postgres running
```

#### Terminal 2 - Backend:
```bash
cd /workspaces/transitpulse/transitpulse-backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload
```
**Wait for this message**: `Uvicorn running on http://0.0.0.0:9002`

#### Terminal 3 - Frontend:
```bash
cd /workspaces/transitpulse/transitpulse-frontend
npm install  # Only needed first time
npm run dev
```
**Wait for this message**: `Local: http://localhost:3002`

### 🌐 Then Access:
- **Main App**: http://localhost:3002
- **API Docs**: http://localhost:9002/docs

---

### ⚡ OPTION 2: Alternative Backend Start

If the uvicorn command doesn't work, try:

```bash
cd /workspaces/transitpulse/transitpulse-backend
python3 main.py
```

---

### ⚡ OPTION 3: Check for Issues

If still not working, run these diagnostic commands:

```bash
# Check if ports are free
lsof -i :9002
lsof -i :3002

# Check if database is running
docker ps

# Test backend import
cd /workspaces/transitpulse/transitpulse-backend
python3 -c "from app.main import app; print('SUCCESS')"

# Install backend dependencies
pip3 install -r requirements.txt

# Install frontend dependencies
cd /workspaces/transitpulse/transitpulse-frontend
npm install
```

---

### 🎯 Expected Results:

1. **Backend running**: You should see uvicorn logs
2. **Frontend running**: You should see Vite dev server logs
3. **Database running**: `docker ps` shows postgres container
4. **Access working**: http://localhost:3002 loads the app

### 📅 Testing Schedule Feature:

Once http://localhost:3002 is working:
1. Click the **📅 Schedules** tab
2. Select any route from the left panel
3. Pick a date from the dropdown
4. Try the different view modes

The key is getting all three services (database, backend, frontend) running simultaneously!
