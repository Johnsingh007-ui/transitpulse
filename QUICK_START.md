# TransitPulse - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### 1. Start Database
```bash
docker-compose up -d
```

### 2. Start Backend
```bash
cd transitpulse-backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start Frontend  
```bash
cd transitpulse-frontend
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/v1/test

## 📊 What You'll See

- **12 Golden Gate Transit routes** loaded with real data
- **500+ bus stops** with GPS coordinates  
- **Route details** including colors, accessibility, and schedules
- **Network statistics** dashboard
- **Interactive route explorer** with stop listings

## 🔧 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3002 | http://localhost:3002 |
| Backend | 8000 | http://localhost:8000 |
| Database | 5432 | localhost:5432 |

## ✅ Health Check

Test that everything is working:

```bash
# Backend health
curl http://localhost:8000/api/v1/test

# Routes data  
curl http://localhost:8000/api/v1/routes

# Stops for route 101
curl "http://localhost:8000/api/v1/stops?route_id=101"
```

## 🐛 Common Issues

- **HTTP 401**: Check vite.config.ts proxy points to port 8000
- **Backend won't start**: Ensure port 8000 is free
- **No data**: Database may need restart: `docker-compose restart`
- **Frontend 502**: Check that backend is running on port 8000

---
*Ready to explore real transit data! 🚌*
