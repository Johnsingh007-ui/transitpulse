# TransitPulse Production Setup Guide

## System Overview
TransitPulse is a real-time transit tracking system with a React frontend and FastAPI backend, displaying live Golden Gate Transit data.

## Port Configuration
- **Frontend (Vite + React)**: Port 3002
- **Backend (FastAPI)**: Port 9002
- **Database (PostgreSQL)**: Port 5432

## Quick Start Commands

### Start Backend
```bash
cd transitpulse-backend
python main.py
# Server will start on http://localhost:9002
```

### Start Frontend
```bash
cd transitpulse-frontend
npm run dev
# Development server will start on http://localhost:3002
```

### Access Application
- Frontend: http://localhost:3002
- Backend API: http://localhost:9002
- API Documentation: http://localhost:9002/docs

## System Status (Working Features)
✅ Real-time vehicle tracking (28 active vehicles)
✅ All 12 GTFS routes loading correctly
✅ Route selection without auto-revert issues
✅ Live Golden Gate Transit data integration
✅ Vehicle status and occupancy tracking
✅ Responsive UI with clean console output

## Available Routes
- 101 - Santa Rosa - San Francisco
- 114, 130, 132, 150, 154, 164, 172, 172X - Various Bay Area routes
- 580, 580X - San Rafael - San Francisco
- 704 - Additional local service

## Technical Stack
- **Frontend**: React 18, Vite, Chakra UI, TypeScript
- **Backend**: FastAPI, Python 3.12, PostgreSQL
- **Data**: GTFS Static + GTFS Real-time feeds
- **Proxy**: Vite dev server proxy for API calls

## Last Updated
July 14, 2025 - All major functionality working correctly
