#!/bin/bash

# Cloud Storage Platform - Start Script
# Starts both backend and frontend services

echo "☁️  Starting Cloud Storage Platform..."

# Kill any existing processes on ports 3000 and 5173
echo "🔄 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend
echo "🚀 Starting backend server on port 3000..."
cd "$SCRIPT_DIR"
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting frontend on port 5173..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle shutdown
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for processes
wait
