#!/bin/bash

echo "🔧 TransitPulse Debug Startup"
echo "============================="

# Kill any existing processes
echo "1. Cleaning up existing processes..."
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "python.*main" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
sleep 2

# Start database
echo "2. Starting database..."
cd /workspaces/transitpulse
docker-compose up -d
sleep 3

# Test database
echo "3. Testing database connection..."
docker-compose ps

# Start backend
echo "4. Starting backend..."
cd /workspaces/transitpulse/transitpulse-backend

# Test Python import
echo "   Testing Python imports..."
python3 -c "from app.main import app; print('✅ App import successful')" || {
    echo "❌ App import failed"
    exit 1
}

# Start backend
echo "   Starting uvicorn server..."
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait and test backend
echo "   Waiting 10 seconds for backend to start..."
sleep 10

echo "   Testing backend connection..."
curl -s http://localhost:9002/api/v1/test > /dev/null && {
    echo "✅ Backend is running at http://localhost:9002"
} || {
    echo "❌ Backend test failed"
    echo "Backend log:"
    tail -20 backend.log
    exit 1
}

# Start frontend
echo "5. Starting frontend..."
cd /workspaces/transitpulse/transitpulse-frontend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "   Installing npm dependencies..."
    npm install
fi

# Start frontend
echo "   Starting Vite server..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait and test frontend
echo "   Waiting 15 seconds for frontend to start..."
sleep 15

echo "   Testing frontend connection..."
curl -s http://localhost:3002 > /dev/null && {
    echo "✅ Frontend is running at http://localhost:3002"
} || {
    echo "❌ Frontend test failed"
    echo "Frontend log:"
    tail -20 frontend.log
}

echo ""
echo "🎉 STARTUP COMPLETE!"
echo "==================="
echo "🌐 Frontend:    http://localhost:3002"
echo "📡 Backend:     http://localhost:9002"
echo "📚 API Docs:    http://localhost:9002/docs"
echo ""
echo "📅 Schedule Feature:"
echo "   1. Go to http://localhost:3002"
echo "   2. Click 'Schedules' tab"
echo "   3. Select a route and date"
echo ""
echo "🔧 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📋 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   docker-compose down"
