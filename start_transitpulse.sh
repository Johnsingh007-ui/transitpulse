#!/bin/bash

# TransitPulse Startup Script
echo "🚌 Starting TransitPulse..."
echo "=========================="

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Function to kill processes on specific ports
kill_port() {
    echo "🔄 Killing processes on port $1..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and kill existing processes
echo "1. Checking ports..."
if ! check_port 9002; then
    kill_port 9002
fi

if ! check_port 3002; then
    kill_port 3002
fi

# Start database
echo "2. Starting database..."
cd /workspaces/transitpulse
docker-compose up -d
sleep 3

# Start backend
echo "3. Starting backend (port 9002)..."
cd /workspaces/transitpulse/transitpulse-backend

# Check if requirements are installed
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend in background
echo "   Starting FastAPI backend..."
python main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 5

# Test backend
if curl -s http://localhost:9002/api/v1/test > /dev/null; then
    echo "   ✅ Backend is running at http://localhost:9002"
else
    echo "   ❌ Backend failed to start"
    echo "   Check backend.log for errors"
    exit 1
fi

# Start frontend
echo "4. Starting frontend (port 3002)..."
cd /workspaces/transitpulse/transitpulse-frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing npm dependencies..."
    npm install
fi

# Start frontend in background
echo "   Starting Vite development server..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "   Waiting for frontend to start..."
sleep 10

# Test frontend
if curl -s http://localhost:3002 > /dev/null; then
    echo "   ✅ Frontend is running at http://localhost:3002"
else
    echo "   ❌ Frontend failed to start"
    echo "   Check frontend.log for errors"
fi

echo ""
echo "🎉 TransitPulse is ready!"
echo "=========================="
echo "🌐 Frontend:     http://localhost:3002"
echo "📡 Backend API:  http://localhost:9002"
echo "📚 API Docs:     http://localhost:9002/docs"
echo ""
echo "📅 To test the new schedule feature:"
echo "   1. Go to http://localhost:3002"
echo "   2. Click the 'Schedules' tab"
echo "   3. Select a route and date"
echo ""
echo "🔧 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   docker-compose down"
echo ""
echo "📋 Process IDs:"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
