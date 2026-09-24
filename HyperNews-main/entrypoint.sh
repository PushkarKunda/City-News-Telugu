#!/bin/bash
# Production startup script for Docker containers
# Runs database migrations and starts the application

set -e  # Exit on error

echo "🚀 Starting Production Deployment..."

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U $POSTGRES_USER; do
  sleep 2
done
echo "✅ PostgreSQL is ready"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until redis-cli -h redis -p 6379 --raw incr ping > /dev/null 2>&1; do
  sleep 2
done
echo "✅ Redis is ready"

# Run Alembic migrations
echo "🔄 Running database migrations..."
alembic upgrade head
echo "✅ Database migrations completed"

# Start the application
echo "🎯 Starting FastAPI application..."
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --log-level info \
  --access-log
