#!/bin/bash

echo "=========================================="
echo "TRANSITPULSE ACCESS INFORMATION"
echo "=========================================="
echo ""

# Check if we're in GitHub Codespaces
if [ ! -z "$CODESPACE_NAME" ]; then
    echo "🚀 GITHUB CODESPACES DETECTED"
    echo ""
    echo "📋 Quick Setup:"
    echo "1. Open the 'PORTS' tab in VS Code"
    echo "2. Find ports 3000 and 9001"
    echo "3. Change visibility from 'Private' to 'Public'"
    echo "4. Click the 'Globe' icon to open in browser"
    echo ""
    echo "🌐 Your Codespace URLs:"
    echo "Frontend: https://$CODESPACE_NAME-3000.app.github.dev"
    echo "Backend:  https://$CODESPACE_NAME-9001.app.github.dev"
    echo ""
else
    echo "💻 LOCAL DEVELOPMENT"
    echo ""
    echo "🌐 Access URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:9001"
    echo ""
fi

echo "🔧 Service Status:"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend (3000): RUNNING" || echo "❌ Frontend (3000): NOT RUNNING"
curl -s http://localhost:9001/test > /dev/null && echo "✅ Backend (9001): RUNNING" || echo "❌ Backend (9001): NOT RUNNING"

echo ""
echo "📊 API Endpoints:"
echo "  - GET /api/v1/routes"
echo "  - GET /api/v1/vehicles/realtime"
echo "  - GET /docs (API documentation)"

echo ""
echo "🛠️ If services aren't running:"
echo "  Run: ./start_complete.sh"
echo ""
echo "=========================================="
