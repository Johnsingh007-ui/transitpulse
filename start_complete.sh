#!/bin/bash

# TransitPulse Complete Startup Script
# This script starts both the backend and frontend services

echo "=========================================="
echo "TRANSITPULSE COMPLETE STARTUP"
echo "=========================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "🔪 Killing any existing processes on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Check current directory
if [[ ! -d "transitpulse-backend" ]] || [[ ! -d "transitpulse-frontend" ]]; then
    echo "❌ Error: Must run from the root transitpulse directory"
    echo "Current directory: $(pwd)"
    echo "Please run: cd /workspaces/transitpulse && ./start_complete.sh"
    exit 1
fi

echo "✅ Running from correct directory: $(pwd)"

# Clean up any existing processes
echo ""
echo "🧹 Cleaning up existing processes..."
kill_port 9001
kill_port 3000
sleep 2

echo ""
echo "🚀 Starting TransitPulse Backend (Port 9001)..."
cd transitpulse-backend
python fastapi_port_9001.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 3

echo ""
echo "🌐 Starting TransitPulse Frontend (Port 3000)..."
cd ../transitpulse-frontend

# Start frontend with explicit host binding for Codespaces
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "=========================================="
echo "✅ TRANSITPULSE STARTUP COMPLETE"
echo "=========================================="
echo ""
echo "🖥️  Backend API: http://localhost:9001"
echo "     - API Docs: http://localhost:9001/docs"
echo "     - Health Check: http://localhost:9001/test"
echo ""
echo "🌐 Frontend App: http://localhost:3000"
echo ""
echo "🔧 For GitHub Codespaces:"
echo "   1. Check the 'PORTS' tab in VS Code"
echo "   2. Make ports 3000 and 9001 public"
echo "   3. Use the forwarded URLs provided"
echo ""
echo "📊 API Endpoints:"
echo "   - GET /api/v1/routes - Get all routes"
echo "   - GET /api/v1/vehicles/realtime - Get real-time vehicles"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo "=========================================="

# Keep script running to show logs
wait
