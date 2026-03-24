# Start both frontend and backend servers

Write-Host "🚀 Starting DocuMind Insight..." -ForegroundColor Cyan
Write-Host ""

# Check if server/.env exists
if (-Not (Test-Path "server\.env")) {
    Write-Host "⚠️  Warning: server/.env not found!" -ForegroundColor Yellow
    Write-Host "Please create server/.env and add your OpenAI API key" -ForegroundColor Yellow
    Write-Host "See API_KEY_SETUP.md for instructions" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

Write-Host "📦 Installing dependencies (if needed)..." -ForegroundColor Green
Write-Host ""

# Install frontend dependencies
if (-Not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    npm install
}

# Install backend dependencies
if (-Not (Test-Path "server\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    Set-Location server
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "🎯 Starting servers..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in background
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev" -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend (this will block)
npm run dev

# Cleanup: kill backend when frontend exits
Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
