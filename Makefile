# DataSight-VitaLake Docker Makefile

.PHONY: help build run dev stop clean logs test

# Default target
help:
	@echo "DataSight-VitaLake Docker Commands:"
	@echo "  make build     - Build the Docker image"
	@echo "  make run       - Run with Docker Compose"
	@echo "  make dev       - Run in development mode"
	@echo "  make stop      - Stop all containers"
	@echo "  make clean     - Remove containers and images"
	@echo "  make logs      - Show container logs"
	@echo "  make test      - Test the Docker build"
	@echo "  make shell     - Access container shell"

# Build the Docker image
build:
	@echo "Building DataSight-VitaLake Docker image..."
	docker build -t datasight-vitalake .

# Run with Docker Compose
run:
	@echo "Starting DataSight-VitaLake with Docker Compose..."
	docker-compose up --build

# Run in development mode
dev:
	@echo "Starting in development mode..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop all containers
stop:
	@echo "Stopping all containers..."
	docker-compose down

# Clean up containers, images, and volumes
clean:
	@echo "Cleaning up Docker resources..."
	docker-compose down -v --remove-orphans
	docker image prune -f
	docker volume prune -f

# Show logs
logs:
	@echo "Showing container logs..."
	docker-compose logs -f datasight

# Test the Docker build
test:
	@echo "Testing Docker build..."
	docker build -t datasight-vitalake-test .
	docker run --rm -p 3001:3000 -d --name test-container datasight-vitalake-test
	@echo "Waiting for container to start..."
	@sleep 10
	@echo "Testing health endpoint..."
	curl -f http://localhost:3001 || (docker stop test-container && exit 1)
	docker stop test-container
	@echo "✅ Docker build test passed!"

# Access container shell
shell:
	@echo "Accessing container shell..."
	docker-compose exec datasight sh

# Database shell
db-shell:
	@echo "Accessing PostgreSQL shell..."
	docker-compose exec postgres psql -U datasight -d datasight
