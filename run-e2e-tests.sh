#!/bin/bash

# E2E Test Runner with Docker Backend
# This script starts the Docker backend and runs E2E tests

set -e

echo "🐳 Starting Docker backend..."
cd /home/amidha/dasportz/backend-process-payments
sudo docker-compose -f docker-compose.test.yml up -d --build

echo "⏳ Waiting for backend to be healthy..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start"
        sudo docker-compose -f docker-compose.test.yml logs backend
        exit 1
    fi
    sleep 2
done

echo "🧪 Running E2E tests..."
cd /home/amidha/dasportz/dasportz.github.io
npx playwright test tests/e2e/payment-update.spec.ts --reporter=list

echo "🛑 Stopping Docker backend..."
cd /home/amidha/dasportz/backend-process-payments
sudo docker-compose -f docker-compose.test.yml down

echo "✅ Done!"
