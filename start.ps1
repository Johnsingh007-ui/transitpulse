# Start script for TransitPulse (Docker-free)
# Run with: powershell -ExecutionPolicy Bypass -File .\start.ps1

# Set environment variables
$env:DATABASE_URL = "postgresql+asyncpg://transitpulse_user:transitpulse_pass@localhost:5432/transitpulse_db"
$env:REDIS_URL = "redis://localhost:6379/0"

# Start Redis if not running
if (-not (Get-Process -Name "redis-server" -ErrorAction SilentlyContinue)) {
    Write-Host "Starting Redis server..." -ForegroundColor Cyan
    Start-Process "redis-server" -ArgumentList "--port 6379" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`
    cd '$PSScriptRoot\transitpulse-backend'; 
    if (Test-Path '.venv\Scripts\Activate.ps1') { 
        .\.venv\Scripts\Activate.ps1; 
        uvicorn app.main:app --host 0.0.0.0 --port 9000 --reload 
    } else { 
        Write-Host 'Error: Virtual environment not found. Please run setup.ps1 first' -ForegroundColor Red 
    }"

# Start frontend
Write-Host "Starting frontend development server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`
    cd '$PSScriptRoot\transitpulse-frontend'; 
    if (Test-Path 'node_modules') { 
        npm run dev 
    } else { 
        Write-Host 'Error: Node modules not found. Please run setup.ps1 first' -ForegroundColor Red 
    }"

# Open browser after a short delay
Start-Sleep -Seconds 5
Write-Host "🚀 Opening TransitPulse in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:3002"
