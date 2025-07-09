# PowerShell script to launch TransitPulse backend and frontend
# Run with: powershell -ExecutionPolicy Bypass -File .\start-transitpulse.ps1

# Function to check if a port is in use
function Test-PortInUse {
    param([int]$Port)
    $tcpConnection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    $udpConnection = Get-NetUDPEndpoint -LocalPort $Port -ErrorAction SilentlyContinue
    return ($null -ne $tcpConnection -or $null -ne $udpConnection)
}

# Check if required ports are available
$portsInUse = @()
@(9000, 3002) | ForEach-Object {
    if (Test-PortInUse -Port $_) {
        $portsInUse += $_
    }
}

if ($portsInUse.Count -gt 0) {
    Write-Host "🚨 Error: The following ports are already in use: $($portsInUse -join ', ')" -ForegroundColor Red
    Write-Host "Please close any applications using these ports and try again." -ForegroundColor Yellow
    exit 1
}

# Set paths
$backendPath = "$PSScriptRoot\transitpulse-backend"
$frontendPath = "$PSScriptRoot\transitpulse-frontend"

# Launch FastAPI backend
Write-Host "🚀 Starting FastAPI backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`
    cd '$backendPath'; `
    if (Test-Path '.venv\Scripts\Activate.ps1') { `
        .\.venv\Scripts\Activate.ps1; `
        uvicorn main:app --host 0.0.0.0 --port 9000 --reload `
    } else { `
        Write-Host 'Error: Virtual environment not found in $backendPath\.venv' -ForegroundColor Red `
    }"

# Launch Vite frontend
Write-Host "🚀 Starting Vite frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`
    cd '$frontendPath'; `
    if (Test-Path 'node_modules') { `
        npm run dev `
    } else { `
        Write-Host 'Installing dependencies...' -ForegroundColor Yellow; `
        npm install; `
        npm run dev `
    }"

# Open frontend in browser after short delay
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "🌐 Opening http://localhost:3002 in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:3002"