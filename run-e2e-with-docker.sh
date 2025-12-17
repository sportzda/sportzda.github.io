#!/bin/bash
set -e

echo "🚀 Starting E2E tests with Docker backend..."

# Navigate to backend directory
cd ../backend-process-payments

# Stop any existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Start backend and database in Docker
echo "🐳 Starting backend and MongoDB in Docker..."
docker-compose -f docker-compose.test.yml up -d --build

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts - waiting for backend..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start"
    docker-compose -f docker-compose.test.yml logs backend
    docker-compose -f docker-compose.test.yml down -v
    exit 1
fi

# Navigate back to frontend
cd ../dasportz.github.io

# Run E2E tests
echo "🧪 Running E2E tests..."
BACKEND_RUNNING=true npm run test:e2e

# Save exit code
test_exit_code=$?

# Cleanup
echo "🧹 Cleaning up Docker containers..."
cd ../backend-process-payments
docker-compose -f docker-compose.test.yml down -v

if [ $test_exit_code -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Tests failed with exit code $test_exit_code"
fi

exit $test_exit_code
