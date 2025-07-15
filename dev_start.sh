#!/bin/bash
# TransitPulse Quick Development Startup
# Use this for daily development after initial setup

set -e

echo "🚀 TransitPulse Quick Start"
echo "==========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_PORT=9002
FRONTEND_PORT=3002

# Check if in correct directory
if [ ! -d "transitpulse-backend" ] || [ ! -d "transitpulse-frontend" ]; then
    echo -e "${RED}❌ Run from transitpulse root directory${NC}"
    exit 1
fi

# Kill existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
for port in $BACKEND_PORT $FRONTEND_PORT; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Killing process on port $port${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# Start database
echo -e "${BLUE}🗄️ Starting database...${NC}"
docker-compose up -d

# Wait for database
echo -e "${YELLOW}Waiting for database...${NC}"
while ! docker exec transitpulse-db-1 pg_isready -U transitpulse_user -d transitpulse_db >/dev/null 2>&1; do
    sleep 1
done
echo -e "${GREEN}✅ Database ready${NC}"

# Start backend
echo -e "${BLUE}🚀 Starting backend...${NC}"
cd transitpulse-backend
if [ -d "venv" ]; then
    source venv/bin/activate
fi
nohup python3 main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..

# Wait for backend
sleep 3
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend started (port $BACKEND_PORT)${NC}"
else
    echo -e "${RED}❌ Backend failed - check backend.log${NC}"
    exit 1
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend...${NC}"
cd transitpulse-frontend
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
cd ..

# Wait for frontend
sleep 5
if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend started (port $FRONTEND_PORT)${NC}"
else
    echo -e "${RED}❌ Frontend failed - check frontend.log${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 TransitPulse Ready!${NC}"
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}Backend:${NC} http://localhost:$BACKEND_PORT"
echo -e "${BLUE}API Docs:${NC} http://localhost:$BACKEND_PORT/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    [ -f backend.pid ] && kill $(cat backend.pid) 2>/dev/null && rm backend.pid
    [ -f frontend.pid ] && kill $(cat frontend.pid) 2>/dev/null && rm frontend.pid
    docker-compose down
    echo -e "${GREEN}✅ Stopped${NC}"
    exit 0
}

trap cleanup INT TERM
wait
