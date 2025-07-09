# Setup script for TransitPulse (Docker-free)
# Run with: powershell -ExecutionPolicy Bypass -File .\setup.ps1

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed
$pgInstalled = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgInstalled) {
    Write-Host "PostgreSQL not found. Installing PostgreSQL..." -ForegroundColor Yellow
    # Download and install PostgreSQL
    $pgInstallerUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.5-1-windows-x64.exe"
    $pgInstallerPath = "$env:TEMP\postgresql-installer.exe"
    
    Invoke-WebRequest -Uri $pgInstallerUrl -OutFile $pgInstallerPath
    Start-Process -FilePath $pgInstallerPath -ArgumentList "--unattendedmodeui none --mode unattended --superpassword mysecretpassword --serverport 5432" -Wait
    
    # Add PostgreSQL to PATH
    $pgPath = "C:\Program Files\PostgreSQL\15\bin"
    $currentPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    if ($currentPath -notlike "*$pgPath*") {
        [Environment]::SetEnvironmentVariable('Path', "$currentPath;$pgPath", 'Machine')
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# Create database and user
Write-Host "Setting up database..." -ForegroundColor Cyan
$env:PGPASSWORD = "mysecretpassword"
psql -U postgres -c "CREATE DATABASE transitpulse_db;" 2>$null
psql -U postgres -d transitpulse_db -c "CREATE USER transitpulse_user WITH PASSWORD 'transitpulse_pass';" 2>$null
psql -U postgres -d transitpulse_db -c "GRANT ALL PRIVILEGES ON DATABASE transitpulse_db TO transitpulse_user;" 2>$null

# Set up Python backend
Write-Host "Setting up Python backend..." -ForegroundColor Cyan
cd $PSScriptRoot\transitpulse-backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Set up environment variables
$env:DATABASE_URL = "postgresql+asyncpg://transitpulse_user:transitpulse_pass@localhost:5432/transitpulse_db"
$env:REDIS_URL = "redis://localhost:6379/0"

# Set up frontend
Write-Host "Setting up frontend..." -ForegroundColor Cyan
cd ..\transitpulse-frontend

# Install Node.js dependencies
npm install

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "To start the application, run: .\start.ps1" -ForegroundColor Green
