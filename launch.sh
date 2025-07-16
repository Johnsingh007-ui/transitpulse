#!/bin/bash
# TransitPulse Universal Launcher
# Comprehensive script that handles setup, dependency fixes, and startup

set -e

echo "🚀 TransitPulse Universal Launcher"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BACKEND_PORT=9002
FRONTEND_PORT=3002
DB_CONTAINER_NAME="transitpulse-db-1"
MAX_WAIT_TIME=60
HEALTH_CHECK_INTERVAL=2

# Check if in correct directory
check_directory() {
    if [ ! -d "transitpulse-backend" ] || [ ! -d "transitpulse-frontend" ]; then
        echo -e "${RED}❌ Please run this script from the transitpulse root directory${NC}"
        echo -e "${YELLOW}Expected structure:${NC}"
        echo -e "  transitpulse/"
        echo -e "    ├── transitpulse-backend/"
        echo -e "    ├── transitpulse-frontend/"
        echo -e "    └── launch.sh"
        exit 1
    fi
}

# System checks
run_system_checks() {
    echo -e "${BLUE}🔍 Running system checks...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python 3: $(python3 --version)${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker not running${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Kill existing processes
cleanup_existing_processes() {
    echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
    
    # Kill processes on our ports
    for port in $BACKEND_PORT $FRONTEND_PORT; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}  Killing process on port $port${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    done
    
    # Clean up old pid files
    [ -f backend.pid ] && rm -f backend.pid
    [ -f frontend.pid ] && rm -f frontend.pid
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Fix backend requirements and configuration
setup_backend() {
    echo -e "${BLUE}🔧 Setting up backend...${NC}"
    
    cd transitpulse-backend
    
    # Create virtual environment if missing
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}  Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Upgrade pip and install core dependencies
    echo -e "${YELLOW}  Installing/updating dependencies...${NC}"
    pip install --upgrade pip >/dev/null 2>&1
    pip install --upgrade setuptools wheel >/dev/null 2>&1
    pip install psycopg2-binary asyncpg >/dev/null 2>&1
    
    # Install all requirements
    pip install -r requirements.txt >/dev/null 2>&1
    
    # Create .env if missing
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}  Creating backend .env file...${NC}"
        cat > .env << 'EOF'
# Database Configuration
POSTGRES_SERVER=localhost
POSTGRES_USER=transitpulse_user
POSTGRES_PASSWORD=transitpulse_pass
POSTGRES_DB=transitpulse_db
DATABASE_URL=postgresql+asyncpg://transitpulse_user:transitpulse_pass@localhost:5432/transitpulse_db

# Application Settings
ENVIRONMENT=development
LOG_LEVEL=INFO
DEBUG=true

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3002,http://127.0.0.1:3002,http://localhost:3000,http://127.0.0.1:3000

# API Settings
API_V1_STR=/api/v1
PROJECT_NAME=TransitPulse
PROJECT_DESCRIPTION="Real-time transit operations dashboard"
PROJECT_VERSION=1.0.0

# GTFS Configuration
GTFS_AGENCY_ID=golden_gate_transit
DEFAULT_AGENCY_ID=golden_gate_transit
EOF
    fi
    
    # Verify critical imports
    echo -e "${YELLOW}  Verifying backend dependencies...${NC}"
    python3 -c "
import sys
try:
    import fastapi, uvicorn, sqlalchemy, asyncpg, databases
    print('✅ Backend dependencies verified')
except ImportError as e:
    print(f'❌ Backend dependency error: {e}')
    sys.exit(1)
" || {
    echo -e "${RED}❌ Backend dependency verification failed${NC}"
    exit 1
}
    
    cd ..
    echo -e "${GREEN}✅ Backend setup completed${NC}"
}

# Setup frontend
setup_frontend() {
    echo -e "${BLUE}🔧 Setting up frontend...${NC}"
    
    cd transitpulse-frontend
    
    # Install dependencies if node_modules doesn't exist or is corrupted
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.integrity" ]; then
        echo -e "${YELLOW}  Installing frontend dependencies...${NC}"
        npm install >/dev/null 2>&1
        touch node_modules/.integrity
    fi
    
    # Verify critical imports
    echo -e "${YELLOW}  Verifying frontend dependencies...${NC}"
    node -e "
try {
    require('react');
    require('react-dom');
    require('@chakra-ui/react');
    console.log('✅ Frontend dependencies verified');
} catch (e) {
    console.error('❌ Frontend dependency error:', e.message);
    process.exit(1);
}
" || {
    echo -e "${RED}❌ Frontend dependency verification failed${NC}"
    exit 1
}
    
    cd ..
    echo -e "${GREEN}✅ Frontend setup completed${NC}"
}

# Start and wait for database
start_database() {
    echo -e "${BLUE}🗄️ Starting database...${NC}"
    
    # Stop any existing containers
    docker-compose down >/dev/null 2>&1 || true
    
    # Start database
    docker-compose up -d
    
    # Wait for database with proper timeout and health checks
    echo -e "${YELLOW}  Waiting for database to be ready...${NC}"
    local attempts=0
    local max_attempts=$((MAX_WAIT_TIME / HEALTH_CHECK_INTERVAL))
    
    while [ $attempts -lt $max_attempts ]; do
        if docker exec $DB_CONTAINER_NAME pg_isready -U transitpulse_user -d transitpulse_db >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database is ready${NC}"
            return 0
        fi
        
        # Show progress
        local dots=$((attempts % 4))
        local progress_str=""
        for i in $(seq 0 $dots); do
            progress_str="${progress_str}."
        done
        echo -ne "\r${YELLOW}  Waiting for database${progress_str}   ${NC}"
        
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    echo -e "\n${RED}❌ Database failed to start within ${MAX_WAIT_TIME} seconds${NC}"
    exit 1
}

# Start backend with proper health checks
start_backend() {
    echo -e "${BLUE}🚀 Starting backend...${NC}"
    
    cd transitpulse-backend
    source venv/bin/activate
    
    # Start backend in background
    nohup python3 main.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    
    # Wait for backend with health checks
    echo -e "${YELLOW}  Waiting for backend to start...${NC}"
    local attempts=0
    local max_attempts=15  # 30 seconds with 2-second intervals
    
    while [ $attempts -lt $max_attempts ]; do
        # Check if process is still running
        if ! kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "\n${RED}❌ Backend process died - check backend.log${NC}"
            exit 1
        fi
        
        # Check if port is listening
        if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            # Additional health check - try to hit the API
            if curl -f http://localhost:$BACKEND_PORT/ >/dev/null 2>&1; then
                echo -e "\n${GREEN}✅ Backend started successfully (port $BACKEND_PORT)${NC}"
                return 0
            fi
        fi
        
        # Show progress
        local dots=$((attempts % 4))
        local progress_str=""
        for i in $(seq 0 $dots); do
            progress_str="${progress_str}."
        done
        echo -ne "\r${YELLOW}  Starting backend${progress_str}   ${NC}"
        
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    echo -e "\n${RED}❌ Backend failed to start - check backend.log${NC}"
    exit 1
}

# Start frontend with proper health checks
start_frontend() {
    echo -e "${BLUE}🎨 Starting frontend...${NC}"
    
    cd transitpulse-frontend
    
    # Start frontend in background
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    
    # Wait for frontend with health checks
    echo -e "${YELLOW}  Waiting for frontend to start...${NC}"
    local attempts=0
    local max_attempts=20  # 40 seconds with 2-second intervals
    
    while [ $attempts -lt $max_attempts ]; do
        # Check if process is still running
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo -e "\n${RED}❌ Frontend process died - check frontend.log${NC}"
            exit 1
        fi
        
        # Check if port is listening
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "\n${GREEN}✅ Frontend started successfully (port $FRONTEND_PORT)${NC}"
            return 0
        fi
        
        # Show progress
        local dots=$((attempts % 4))
        local progress_str=""
        for i in $(seq 0 $dots); do
            progress_str="${progress_str}."
        done
        echo -ne "\r${YELLOW}  Starting frontend${progress_str}   ${NC}"
        
        sleep $HEALTH_CHECK_INTERVAL
        ((attempts++))
    done
    
    echo -e "\n${RED}❌ Frontend failed to start - check frontend.log${NC}"
    exit 1
}

# Show final status and URLs
show_status() {
    echo ""
    echo -e "${GREEN}🎉 TransitPulse is now running!${NC}"
    echo -e "${PURPLE}================================${NC}"
    echo -e "${CYAN}🌐 Frontend:${NC}    http://localhost:$FRONTEND_PORT"
    echo -e "${CYAN}🔧 Backend API:${NC} http://localhost:$BACKEND_PORT"
    echo -e "${CYAN}📚 API Docs:${NC}   http://localhost:$BACKEND_PORT/docs"
    echo -e "${CYAN}🗄️ Database:${NC}   localhost:5432 (transitpulse_db)"
    echo ""
    echo -e "${YELLOW}📝 Logs:${NC}"
    echo -e "  Backend: ${BLUE}backend.log${NC}"
    echo -e "  Frontend: ${BLUE}frontend.log${NC}"
    echo ""
    echo -e "${YELLOW}🛑 To stop all services:${NC} Press Ctrl+C"
    echo ""
}

# Cleanup function for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping TransitPulse services...${NC}"
    
    # Kill backend
    if [ -f backend.pid ]; then
        local pid=$(cat backend.pid)
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo -e "${GREEN}✅ Backend stopped${NC}"
        fi
        rm -f backend.pid
    fi
    
    # Kill frontend
    if [ -f frontend.pid ]; then
        local pid=$(cat frontend.pid)
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo -e "${GREEN}✅ Frontend stopped${NC}"
        fi
        rm -f frontend.pid
    fi
    
    # Stop database
    docker-compose down >/dev/null 2>&1
    echo -e "${GREEN}✅ Database stopped${NC}"
    
    echo -e "${GREEN}🎯 All services stopped successfully${NC}"
    exit 0
}

# Main execution
main() {
    # Parse command line arguments
    local skip_setup=false
    local quick_mode=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-setup)
                skip_setup=true
                shift
                ;;
            --quick)
                quick_mode=true
                shift
                ;;
            --help|-h)
                echo "TransitPulse Universal Launcher"
                echo ""
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-setup    Skip dependency installation and setup"
                echo "  --quick         Quick mode (skip setup, minimal checks)"
                echo "  --help, -h      Show this help message"
                echo ""
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Set trap for cleanup
    trap cleanup INT TERM
    
    # Execute steps
    check_directory
    run_system_checks
    cleanup_existing_processes
    
    if [ "$skip_setup" = false ] && [ "$quick_mode" = false ]; then
        setup_backend
        setup_frontend
    fi
    
    start_database
    start_backend
    start_frontend
    show_status
    
    # Keep script running until interrupted
    wait
}

# Run main function with all arguments
main "$@"
