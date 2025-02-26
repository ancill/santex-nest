#!/bin/bash

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# PostgreSQL container configuration
POSTGRES_CONTAINER_NAME="football_data_postgres_dev"
POSTGRES_PORT=5432
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB="football_data"

# Check if the container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER_NAME}$"; then
        echo "PostgreSQL container is already running."
    else
        echo "Starting existing PostgreSQL container..."
        docker start ${POSTGRES_CONTAINER_NAME}
    fi
else
    echo "Creating and starting PostgreSQL container..."
    docker run --name ${POSTGRES_CONTAINER_NAME} \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e POSTGRES_DB=${POSTGRES_DB} \
        -p ${POSTGRES_PORT}:5432 \
        -d postgres:14
fi

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 5

# Check if PostgreSQL is running
if docker exec ${POSTGRES_CONTAINER_NAME} pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} > /dev/null 2>&1; then
    echo "PostgreSQL is running."
    echo ""
    echo "Database connection details:"
    echo "Host: localhost"
    echo "Port: ${POSTGRES_PORT}"
    echo "User: ${POSTGRES_USER}"
    echo "Password: ${POSTGRES_PASSWORD}"
    echo "Database: ${POSTGRES_DB}"
    echo ""
    echo "To connect to the database, use:"
    echo "docker exec -it ${POSTGRES_CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
    echo ""
    echo "To stop the database, use:"
    echo "docker stop ${POSTGRES_CONTAINER_NAME}"
else
    echo "PostgreSQL failed to start."
    exit 1
fi 