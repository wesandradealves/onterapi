# OnTerapi Docker Production Simulation Script for Windows

param(
    [Parameter(Position=0)]
    [string]$Command
)

# Colors
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

Write-Host "[OnTerapi] Docker Production Simulation" -ForegroundColor $Green
Write-Host "==========================================" -ForegroundColor $Green

function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\docker-run.ps1 [command]" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  build    - Build Docker image"
    Write-Host "  up       - Start containers"
    Write-Host "  down     - Stop containers"
    Write-Host "  restart  - Restart containers"
    Write-Host "  logs     - Show logs"
    Write-Host "  shell    - Enter container shell"
    Write-Host "  clean    - Remove containers and images"
    Write-Host ""
}

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker is not installed" -ForegroundColor $Red
    exit 1
}

# Check Docker Compose
$dockerCompose = "docker compose"
if (!(docker compose version 2>$null)) {
    $dockerCompose = "docker-compose"
    if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Host "Error: Docker Compose is not installed" -ForegroundColor $Red
        exit 1
    }
}

switch ($Command) {
    "build" {
        Write-Host "Building Docker image..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose build --no-cache"
    }
    "up" {
        Write-Host "Starting containers..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose up -d"
        Write-Host "[OK] Application is running at http://localhost:3000" -ForegroundColor $Green
        Write-Host "[OK] Health check at http://localhost:3000/health" -ForegroundColor $Green
        Write-Host "[OK] Swagger docs at http://localhost:3000/api" -ForegroundColor $Green
    }
    "down" {
        Write-Host "Stopping containers..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose down"
    }
    "restart" {
        Write-Host "Restarting containers..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose restart"
    }
    "logs" {
        Invoke-Expression "$dockerCompose logs -f app"
    }
    "shell" {
        Write-Host "Entering container shell..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose exec app sh"
    }
    "clean" {
        Write-Host "Cleaning up containers and images..." -ForegroundColor $Yellow
        Invoke-Expression "$dockerCompose down -v"
        docker rmi onterarapi-v4_app 2>$null
        Write-Host "[OK] Cleanup complete" -ForegroundColor $Green
    }
    default {
        Show-Usage
    }
}
