#!/bin/bash
# TransitPulse Requirements Fixer
# Automatically fixes common dependency and configuration issues

set -e

echo "🔧 TransitPulse Requirements Fixer"
echo "=================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fix Python backend requirements
fix_backend_requirements() {
    echo -e "${BLUE}🔧 Fixing backend requirements...${NC}"
    
    cd transitpulse-backend
    
    # Create virtual environment if missing
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Upgrade pip first
    pip install --upgrade pip
    
    # Install core dependencies that commonly fail
    echo -e "${YELLOW}Installing core dependencies...${NC}"
    pip install --upgrade setuptools wheel
    pip install psycopg2-binary  # PostgreSQL adapter
    pip install asyncpg  # Async PostgreSQL
    
    # Install all requirements
    echo -e "${YELLOW}Installing all requirements...${NC}"
    pip install -r requirements.txt
    
    # Verify critical imports
    echo -e "${YELLOW}Verifying critical imports...${NC}"
    python3 -c "
import sys
try:
    import fastapi
    import uvicorn
    import sqlalchemy
    import asyncpg
    import databases
    import pandas
    import requests
    import pydantic
    print('✅ All critical Python packages imported successfully')
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
    "
    
    cd ..
    echo -e "${GREEN}✅ Backend requirements fixed${NC}"
}

# Fix Node.js frontend requirements
fix_frontend_requirements() {
    echo -e "${BLUE}🔧 Fixing frontend requirements...${NC}"
    
    cd transitpulse-frontend
    
    # Clear cache and reinstall if needed
    if [ -d "node_modules" ] && [ ! -f "node_modules/.integrity" ]; then
        echo -e "${YELLOW}Clearing corrupted node_modules...${NC}"
        rm -rf node_modules package-lock.json
    fi
    
    # Install dependencies
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    npm install
    
    # Create integrity marker
    touch node_modules/.integrity
    
    # Verify critical imports
    echo -e "${YELLOW}Verifying critical imports...${NC}"
    node -e "
try {
    require('react');
    require('react-dom');
    require('@chakra-ui/react');
    require('axios');
    require('leaflet');
    require('react-leaflet');
    console.log('✅ All critical Node.js packages loaded successfully');
} catch (e) {
    console.error('❌ Import error:', e.message);
    process.exit(1);
}
    "
    
    cd ..
    echo -e "${GREEN}✅ Frontend requirements fixed${NC}"
}

# Fix configuration files
fix_configuration() {
    echo -e "${BLUE}🔧 Fixing configuration...${NC}"
    
    # Backend environment
    if [ ! -f "transitpulse-backend/.env" ]; then
        echo -e "${YELLOW}Creating backend .env file...${NC}"
        cat > transitpulse-backend/.env << 'EOF'
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
        echo -e "${GREEN}✅ Backend .env created${NC}"
    fi
    
    # Fix backend main.py port configuration
    if ! grep -q "port=9002" transitpulse-backend/main.py; then
        echo -e "${YELLOW}Fixing backend port configuration...${NC}"
        sed -i 's/port=[0-9]*/port=9002/' transitpulse-backend/main.py
        echo -e "${GREEN}✅ Backend port fixed${NC}"
    fi
    
    # Check frontend port configuration
    if ! grep -q "port: 3002" transitpulse-frontend/vite.config.ts; then
        echo -e "${YELLOW}Frontend port may need adjustment${NC}"
    fi
    
    echo -e "${GREEN}✅ Configuration fixed${NC}"
}

# Fix database connection
fix_database() {
    echo -e "${BLUE}🔧 Fixing database connection...${NC}"
    
    # Stop any existing database
    docker-compose down 2>/dev/null || true
    
    # Remove any conflicting containers
    docker container prune -f
    
    # Start fresh database
    docker-compose up -d
    
    # Wait for database
    echo -e "${YELLOW}Waiting for database to be ready...${NC}"
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if docker exec transitpulse-db-1 pg_isready -U transitpulse_user -d transitpulse_db >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Database is ready${NC}"
            return 0
        fi
        sleep 2
        ((attempts++))
    done
    
    echo -e "${RED}❌ Database failed to start${NC}"
    return 1
}

# Fix port conflicts
fix_ports() {
    echo -e "${BLUE}🔧 Fixing port conflicts...${NC}"
    
    local ports=(3002 9002 5432)
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${YELLOW}Killing process on port $port...${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
    done
    
    echo -e "${GREEN}✅ Port conflicts resolved${NC}"
}

# Run system checks
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

# Main execution
main() {
    run_system_checks
    fix_ports
    fix_configuration
    fix_backend_requirements
    fix_frontend_requirements
    fix_database
    
    echo ""
    echo -e "${GREEN}🎉 All requirements fixed!${NC}"
    echo -e "${BLUE}You can now run:${NC}"
    echo -e "  ${YELLOW}./dev_start.sh${NC}     # Quick daily startup"
    echo -e "  ${YELLOW}./setup_and_start.sh${NC}  # Full setup and startup"
}

main "$@"
