#!/bin/bash
# TransitPulse Complete Setup and Startup Script
# This script handles all prerequisites, dependencies, and startup issues

set -euo pipefail  # Exit on any error

echo "🚀 TransitPulse Complete Setup & Startup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=9002
FRONTEND_PORT=3002
DB_PORT=5432
LOG_FILE="/tmp/transitpulse_setup.log"

# Cleanup log file
> "$LOG_FILE"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Error handling
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    log "${YELLOW}Check log file: $LOG_FILE${NC}"
    exit 1
}

# Check if we're in the right directory
check_project_structure() {
    log "${BLUE}🔍 Checking project structure...${NC}"
    if [ ! -d "transitpulse-backend" ] || [ ! -d "transitpulse-frontend" ]; then
        error_exit "Please run this script from the transitpulse root directory"
    fi
    log "${GREEN}✅ Project structure verified${NC}"
}

# Check system requirements
check_system_requirements() {
    log "${BLUE}🔍 Checking system requirements...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error_exit "Python 3 is not installed"
    fi
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    log "${GREEN}✅ Python 3 found: $PYTHON_VERSION${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error_exit "Node.js is not installed"
    fi
    NODE_VERSION=$(node --version)
    log "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error_exit "npm is not installed"
    fi
    NPM_VERSION=$(npm --version)
    log "${GREEN}✅ npm found: $NPM_VERSION${NC}"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed"
    fi
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker is not running. Please start Docker first."
    fi
    log "${GREEN}✅ Docker is running${NC}"
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        error_exit "docker-compose is not installed"
    fi
    log "${GREEN}✅ docker-compose found${NC}"
}

# Check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill existing processes on our ports
cleanup_ports() {
    log "${YELLOW}🧹 Cleaning up existing processes...${NC}"
    
    local ports=($BACKEND_PORT $FRONTEND_PORT)
    for port in "${ports[@]}"; do
        if check_port $port; then
            log "${YELLOW}Killing existing process on port $port${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    done
    log "${GREEN}✅ Port cleanup completed${NC}"
}

# Setup environment files
setup_environment() {
    log "${BLUE}🔧 Setting up environment configuration...${NC}"
    
    # Backend environment
    BACKEND_ENV_FILE="transitpulse-backend/.env"
    if [ ! -f "$BACKEND_ENV_FILE" ]; then
        log "${YELLOW}Creating backend .env file from example...${NC}"
        cp transitpulse-backend/.env.example "$BACKEND_ENV_FILE"
        
        # Update environment variables to match docker-compose
        sed -i 's/POSTGRES_USER=postgres/POSTGRES_USER=transitpulse_user/' "$BACKEND_ENV_FILE"
        sed -i 's/POSTGRES_PASSWORD=your_postgres_password/POSTGRES_PASSWORD=transitpulse_pass/' "$BACKEND_ENV_FILE"
        sed -i 's/POSTGRES_DB=transitpulse/POSTGRES_DB=transitpulse_db/' "$BACKEND_ENV_FILE"
        sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://transitpulse_user:transitpulse_pass@localhost:5432/transitpulse_db|' "$BACKEND_ENV_FILE"
        sed -i 's|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=http://localhost:3002,http://127.0.0.1:3002|' "$BACKEND_ENV_FILE"
        
        log "${GREEN}✅ Backend .env file created and configured${NC}"
    else
        log "${GREEN}✅ Backend .env file already exists${NC}"
    fi
}

# Install Python dependencies
install_python_dependencies() {
    log "${BLUE}📦 Installing Python dependencies...${NC}"
    
    cd transitpulse-backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        log "${YELLOW}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip >> "$LOG_FILE" 2>&1
    
    # Install dependencies
    log "${YELLOW}Installing Python packages (this may take a few minutes)...${NC}"
    pip install -r requirements.txt >> "$LOG_FILE" 2>&1
    
    cd ..
    log "${GREEN}✅ Python dependencies installed${NC}"
}

# Install Node.js dependencies
install_node_dependencies() {
    log "${BLUE}📦 Installing Node.js dependencies...${NC}"
    
    cd transitpulse-frontend
    
    # Clear npm cache if node_modules exists but package.json is newer
    if [ -d "node_modules" ] && [ "package.json" -nt "node_modules" ]; then
        log "${YELLOW}Clearing existing node_modules...${NC}"
        rm -rf node_modules package-lock.json
    fi
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        log "${YELLOW}Installing Node.js packages (this may take a few minutes)...${NC}"
        npm install >> "$LOG_FILE" 2>&1
    else
        log "${GREEN}✅ Node.js dependencies already installed${NC}"
    fi
    
    cd ..
    log "${GREEN}✅ Node.js dependencies ready${NC}"
}

# Start database
start_database() {
    log "${BLUE}🗄️ Starting PostgreSQL Database...${NC}"
    
    # Stop any existing containers
    docker-compose down >> "$LOG_FILE" 2>&1 || true
    
    # Start database
    docker-compose up -d >> "$LOG_FILE" 2>&1
    
    # Wait for database to be ready
    log "${YELLOW}Waiting for database to initialize...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker exec transitpulse-db-1 pg_isready -U transitpulse_user -d transitpulse_db >/dev/null 2>&1; then
            log "${GREEN}✅ Database is ready${NC}"
            return 0
        fi
        if [ $((attempt % 10)) -eq 0 ]; then
            log "${YELLOW}Still waiting for database... (attempt $attempt/$max_attempts)${NC}"
        fi
        sleep 1
        ((attempt++))
    done
    
    error_exit "Database failed to become ready after $max_attempts attempts"
}

# Initialize database
initialize_database() {
    log "${BLUE}🏗️ Initializing database schema...${NC}"
    
    cd transitpulse-backend
    source venv/bin/activate
    
    # Run database initialization
    if [ -f "init_db.py" ]; then
        python3 init_db.py >> "$LOG_FILE" 2>&1 || log "${YELLOW}⚠️ Database initialization had warnings (this may be normal)${NC}"
    fi
    
    cd ..
    log "${GREEN}✅ Database schema initialized${NC}"
}

# Start backend server
start_backend() {
    log "${BLUE}🚀 Starting Backend Server (Port $BACKEND_PORT)...${NC}"
    
    cd transitpulse-backend
    source venv/bin/activate
    
    # Start backend in background
    nohup python3 main.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    
    # Wait for backend to start
    log "${YELLOW}Waiting for backend to initialize...${NC}"
    local attempt=1
    local max_attempts=30
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $BACKEND_PORT; then
            log "${GREEN}✅ Backend started successfully on port $BACKEND_PORT${NC}"
            return 0
        fi
        sleep 1
        ((attempt++))
    done
    
    # Check if process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        log "${RED}❌ Backend process died. Check backend.log for errors:${NC}"
        tail -20 backend.log
        error_exit "Backend failed to start"
    fi
    
    error_exit "Backend failed to bind to port $BACKEND_PORT"
}

# Start frontend server
start_frontend() {
    log "${BLUE}🎨 Starting Frontend Server (Port $FRONTEND_PORT)...${NC}"
    
    cd transitpulse-frontend
    
    # Start frontend in background
    nohup npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
    
    # Wait for frontend to start
    log "${YELLOW}Waiting for frontend to initialize...${NC}"
    local attempt=1
    local max_attempts=60
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $FRONTEND_PORT; then
            log "${GREEN}✅ Frontend started successfully on port $FRONTEND_PORT${NC}"
            return 0
        fi
        sleep 1
        ((attempt++))
    done
    
    # Check if process is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        log "${RED}❌ Frontend process died. Check frontend.log for errors:${NC}"
        tail -20 frontend.log
        error_exit "Frontend failed to start"
    fi
    
    error_exit "Frontend failed to bind to port $FRONTEND_PORT"
}

# Health check
health_check() {
    log "${BLUE}🏥 Running health checks...${NC}"
    
    # Check backend health
    if curl -s "http://localhost:$BACKEND_PORT/docs" > /dev/null; then
        log "${GREEN}✅ Backend API is responding${NC}"
    else
        log "${YELLOW}⚠️ Backend API health check failed${NC}"
    fi
    
    # Check frontend health
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
        log "${GREEN}✅ Frontend is responding${NC}"
    else
        log "${YELLOW}⚠️ Frontend health check failed${NC}"
    fi
}

# Cleanup function
cleanup() {
    log "${YELLOW}🧹 Shutting down TransitPulse...${NC}"
    
    # Kill backend
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm -f backend.pid
    fi
    
    # Kill frontend
    if [ -f "frontend.pid" ]; then
        FRONTEND_PID=$(cat frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm -f frontend.pid
    fi
    
    # Stop database
    docker-compose down >> "$LOG_FILE" 2>&1 || true
    
    log "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Main execution
main() {
    log "${PURPLE}Starting TransitPulse complete setup...${NC}"
    
    check_project_structure
    check_system_requirements
    cleanup_ports
    setup_environment
    install_python_dependencies
    install_node_dependencies
    start_database
    initialize_database
    start_backend
    start_frontend
    health_check
    
    echo ""
    log "${GREEN}🎉 TransitPulse System Started Successfully!${NC}"
    echo "========================================"
    echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
    echo -e "${BLUE}Backend API:${NC} http://localhost:$BACKEND_PORT"
    echo -e "${BLUE}API Docs:${NC} http://localhost:$BACKEND_PORT/docs"
    echo ""
    echo -e "${YELLOW}Log Files:${NC}"
    echo -e "Setup: $LOG_FILE"
    echo -e "Backend: backend.log"
    echo -e "Frontend: frontend.log"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    
    # Keep script running
    wait
}

# Run main function
main "$@"
