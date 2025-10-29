#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[OnTerapi] Docker Production Simulation${NC}"
echo "=========================================="

# Function to show usage
show_usage() {
    echo "Usage: ./docker-run.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build    - Build Docker image"
    echo "  up       - Start containers"
    echo "  down     - Stop containers"
    echo "  restart  - Restart containers"
    echo "  logs     - Show logs"
    echo "  shell    - Enter container shell"
    echo "  clean    - Remove containers and images"
    echo ""
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Determine docker-compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

case "$1" in
    build)
        echo -e "${YELLOW}Building Docker image...${NC}"
        $DOCKER_COMPOSE build --no-cache
        ;;
    up)
        echo -e "${YELLOW}Starting containers...${NC}"
        $DOCKER_COMPOSE up -d
        echo -e "${GREEN}[OK] Application is running at http://localhost:3000${NC}"
        echo -e "${GREEN}[OK] Health check at http://localhost:3000/health${NC}"
        echo -e "${GREEN}[OK] Swagger docs at http://localhost:3000/api${NC}"
        ;;
    down)
        echo -e "${YELLOW}Stopping containers...${NC}"
        $DOCKER_COMPOSE down
        ;;
    restart)
        echo -e "${YELLOW}Restarting containers...${NC}"
        $DOCKER_COMPOSE restart
        ;;
    logs)
        $DOCKER_COMPOSE logs -f app
        ;;
    shell)
        echo -e "${YELLOW}Entering container shell...${NC}"
        $DOCKER_COMPOSE exec app sh
        ;;
    clean)
        echo -e "${YELLOW}Cleaning up containers and images...${NC}"
        $DOCKER_COMPOSE down -v
        docker rmi onterarapi-v4_app 2>/dev/null || true
        echo -e "${GREEN}[OK] Cleanup complete${NC}"
        ;;
    *)
        show_usage
        ;;
esac
