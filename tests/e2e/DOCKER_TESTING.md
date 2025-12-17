# E2E Testing with Docker Backend

## Overview
The E2E tests for payment updates require a real backend server. We use Docker Compose to run the backend with MongoDB in containers, using **test-only credentials** (no real secrets).

## Quick Start

### Option 1: Automated Script
```bash
cd /home/amidha/dasportz/dasportz.github.io
./run-e2e-tests.sh
```

This script will:
1. Start Docker backend with test credentials
2. Wait for backend to be healthy
3. Run E2E tests
4. Stop Docker containers

### Option 2: Manual Steps

1. **Start the Docker backend:**
```bash
cd ../backend-process-payments
sudo docker-compose -f docker-compose.test.yml up -d --build
```

2. **Wait for backend to be ready:**
```bash
# Check health
curl http://localhost:3000/health
# Should return: {"ok":true,"time":"..."}
```

3. **Run the E2E tests:**
```bash
cd ../dasportz.github.io
npx playwright test tests/e2e/payment-update.spec.ts --reporter=list
```

4. **Stop the backend:**
```bash
cd ../backend-process-payments
sudo docker-compose -f docker-compose.test.yml down
```

## Docker Services

### MongoDB (Test)
- **Image:** mongo:6.0.13
- **Port:** 27018 (mapped from 27017 to avoid conflicts)
- **Database:** test_dasportz
- **Container:** dasportz-test-mongodb

### Backend (Test)
- **Port:** 3000
- **Container:** dasportz-backend-test
- **Credentials:** Test-only (see docker-compose.test.yml)

## Test Credentials (NOT REAL)
All credentials in `docker-compose.test.yml` are **test values only**:
- `JWT_SECRET`: test-jwt-secret-key-for-testing-only
- `STAFF_USERNAME`: staff
- `STAFF_PASSWORD`: dasportz2025
- `TWILIO_ACCOUNT_SID`: test_account_sid (Twilio skipped)
- `RAZORPAY_KEY_*`: test_razorpay_key/secret
- `ZOHO_*`: test_zoho_* values

## Troubleshooting

### Backend not starting
```bash
# Check logs
sudo docker-compose -f docker-compose.test.yml logs backend

# Restart
sudo docker-compose -f docker-compose.test.yml restart backend
```

### Port conflicts
If port 3000 or 27018 is already in use:
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :27018

# Kill the process or stop other containers
```

### Tests timing out
```bash
# Increase timeout
npx playwright test tests/e2e/payment-update.spec.ts --timeout=30000
```

## CI/CD Integration
For GitHub Actions, add these steps:
```yaml
- name: Start Docker Backend
  run: |
    cd backend-process-payments
    docker-compose -f docker-compose.test.yml up -d
    
- name: Wait for Backend
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'
    
- name: Run E2E Tests
  run: |
    cd dasportz.github.io
    npm run test:e2e
    
- name: Stop Docker
  if: always()
  run: |
    cd backend-process-payments
    docker-compose -f docker-compose.test.yml down
```
