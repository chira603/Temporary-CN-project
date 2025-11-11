#!/bin/bash

echo "🚀 Starting DNS Resolution Simulator..."

# Start backend
echo "📡 Starting backend server on port 5001..."
node backend/src/server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend
echo "🌐 Starting frontend on port 3001..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ DNS Resolution Simulator is running!"
echo ""
echo "📊 Frontend: http://localhost:3001"
echo "🔧 Backend API: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait

