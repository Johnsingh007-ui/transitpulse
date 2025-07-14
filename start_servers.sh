#!/bin/bash

echo "🚀 Starting TransitPulse Development Servers..."
echo "=================================================="

# Kill any existing processes on our ports
echo "🔄 Cleaning up existing processes..."
pkill -f "python.*fastapi_port_9001.py" 2>/dev/null || true
pkill -f "vite.*3000" 2>/dev/null || true

# Start backend server
echo "🔧 Starting Backend API Server (Port 9001)..."
cd /workspaces/transitpulse/transitpulse-backend
python fastapi_port_9001.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting Frontend Development Server (Port 3000)..."
cd /workspaces/transitpulse/transitpulse-frontend
npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

# Wait for both servers to start
sleep 5

echo ""
echo "✅ Both servers should now be running!"
echo "📱 Frontend: http://localhost:3000"
echo "🔗 Backend API: http://localhost:9001"
echo ""
echo "🔍 Use the following to check server status:"
echo "   ps aux | grep -E '(vite|fastapi_port_9001)'"
echo ""
echo "⏹️  To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait
