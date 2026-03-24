#!/bin/bash

# Start both frontend and backend servers

echo "🚀 Starting DocuMind Insight..."
echo ""

# Check if server/.env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found!"
    echo "Please create server/.env and add your OpenAI API key"
    echo "See API_KEY_SETUP.md for instructions"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Installing dependencies (if needed)..."
echo ""

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Install backend dependencies
if [ ! -d "server/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd server
    npm install
    cd ..
fi

echo ""
echo "🎯 Starting servers..."
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend (this will block)
npm run dev

# Cleanup: kill backend when frontend exits
kill $BACKEND_PID 2>/dev/null
