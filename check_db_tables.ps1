# Connect to the PostgreSQL database container and list all tables
$containerId = docker ps -q --filter name=transitpulse-db
if ($containerId) {
    Write-Host "Found database container: $containerId"
    docker exec -it $containerId psql -U user -d transitpulse_db -c "\dt"
} else {
    Write-Host "No database container found. Starting services..."
    docker-compose up -d
    Start-Sleep -Seconds 10
    $containerId = docker ps -q --filter name=transitpulse-db
    if ($containerId) {
        Write-Host "Database container started: $containerId"
        docker exec -it $containerId psql -U user -d transitpulse_db -c "\dt"
    } else {
        Write-Host "Failed to start database container"
    }
}
