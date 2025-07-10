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
python main.py
```

### 3. Start Frontend  
```bash
cd transitpulse-frontend
npm install
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:9002
- **API Docs**: http://localhost:9002/docs
- **Health Check**: http://localhost:9002/api/v1/test

## 📊 What You'll See

- **12 Golden Gate Transit routes** loaded with real data
- **Route directions** with Inbound/Outbound information and headsigns
- **Real-time vehicles** with live position tracking and direction info
- **500+ bus stops** with GPS coordinates  
- **Route details** including colors, accessibility, and schedules
- **Network statistics** dashboard
- **Interactive route explorer** with stop listings

## 🔧 Ports Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3002 | http://localhost:3002 |
| Backend | 9002 | http://localhost:9002 |
| Database | 5432 | localhost:5432 |

## ✅ Health Check

Test that everything is working:

```bash
# Backend health
curl http://localhost:9002/api/v1/test

# Routes data  
curl http://localhost:9002/api/v1/routes

# Route directions
curl http://localhost:9002/api/v1/routes/directions

# Real-time vehicles with direction info
curl http://localhost:9002/api/v1/vehicles/realtime

# Stops for route 101
curl "http://localhost:9002/api/v1/stops?route_id=101"
```

## 🐛 Common Issues

- **HTTP 401**: Check vite.config.ts proxy points to port 9002
- **Backend won't start**: Ensure port 9002 is free
- **No data**: Database may need restart: `docker-compose restart`
- **Frontend 502**: Check that backend is running on port 9002

---
*Ready to explore real transit data! 🚌*
