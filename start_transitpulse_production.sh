#!/bin/bash
# TransitPulse Complete Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting TransitPulse System..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "transitpulse-backend" ] || [ ! -d "transitpulse-frontend" ]; then
    echo -e "${RED}Error: Please run this script from the transitpulse root directory${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Kill existing processes on our ports
echo -e "${YELLOW}Checking for existing processes...${NC}"
if check_port 9002; then
    echo -e "${YELLOW}Killing existing process on port 9002${NC}"
    lsof -ti:9002 | xargs kill -9 2>/dev/null || true
fi

if check_port 3002; then
    echo -e "${YELLOW}Killing existing process on port 3002${NC}"
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
fi

# Start backend
echo -e "${BLUE}Starting TransitPulse Backend (Port 9002)...${NC}"
cd transitpulse-backend
python main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend started successfully
if check_port 9002; then
    echo -e "${GREEN}✅ Backend started successfully on port 9002${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
echo -e "${BLUE}Starting TransitPulse Frontend (Port 3002)...${NC}"
cd transitpulse-frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 8

# Check if frontend started successfully
if check_port 3002; then
    echo -e "${GREEN}✅ Frontend started successfully on port 3002${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 TransitPulse System Started Successfully!${NC}"
echo "=================================="
echo -e "${BLUE}Frontend:${NC} http://localhost:3002"
echo -e "${BLUE}Backend API:${NC} http://localhost:9002"
echo -e "${BLUE}API Docs:${NC} http://localhost:9002/docs"
echo ""
echo -e "${YELLOW}Features Available:${NC}"
echo "• Real-time vehicle tracking (28 active vehicles)"
echo "• All 12 GTFS routes"
echo "• Live Golden Gate Transit data"
echo "• Vehicle status and occupancy info"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for user interrupt
trap 'echo -e "\n${YELLOW}Shutting down TransitPulse...${NC}"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0' INT

# Keep script running
wait
