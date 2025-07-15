#!/bin/bash
# TransitPulse Status Checker
# Quickly check the status of all services

echo "🔍 TransitPulse Status Check"
echo "============================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_service() {
    local service_name=$1
    local port=$2
    local url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name (port $port) - Running and responding${NC}"
        else
            echo -e "${YELLOW}⚠️ $service_name (port $port) - Running but not responding${NC}"
        fi
    else
        echo -e "${RED}❌ $service_name (port $port) - Not running${NC}"
    fi
}

# Check database
if docker exec transitpulse-db-1 pg_isready -U transitpulse_user -d transitpulse_db >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Database - Running and ready${NC}"
elif docker ps | grep -q transitpulse-db; then
    echo -e "${YELLOW}⚠️ Database - Container running but not ready${NC}"
else
    echo -e "${RED}❌ Database - Not running${NC}"
fi

# Check backend
check_service "Backend API" 9002 "http://localhost:9002/docs"

# Check frontend
check_service "Frontend" 3002 "http://localhost:3002"

echo ""
echo -e "${BLUE}Quick Commands:${NC}"
echo -e "  ${YELLOW}./dev_start.sh${NC}        - Start all services"
echo -e "  ${YELLOW}./fix_requirements.sh${NC} - Fix any issues"
echo -e "  ${YELLOW}./status.sh${NC}           - Check status again"

# Show process info if any services are running
echo ""
echo -e "${BLUE}Process Information:${NC}"
if pgrep -f "python3 main.py" >/dev/null; then
    echo -e "${GREEN}Backend Python process: PID $(pgrep -f 'python3 main.py')${NC}"
fi

if pgrep -f "vite" >/dev/null; then
    echo -e "${GREEN}Frontend Vite process: PID $(pgrep -f 'vite')${NC}"
fi

if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q transitpulse; then
    echo -e "${GREEN}Docker containers:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep transitpulse
fi
