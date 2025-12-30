# Copilot Instructions for DA SPORTZ Frontend

**DA SPORTZ Frontend** (`dasportz.github.io/`) is a vanilla HTML/JavaScript application deployed on GitHub Pages. It communicates with the backend via REST API calls and uses Playwright for E2E testing.

## Quick Start for AI Agents

**Development & Testing:**
```bash
npm test                        # Headless Playwright tests (auto-starts :5173 webserver)
npm test:headed                 # Show browser during test execution
BACKEND_RUNNING=true npm test   # Use already-running backend on localhost:3000
```

**Key Insight**: Playwright automatically starts an `http-server` on port 5173 unless `BACKEND_RUNNING=true` is set. This allows tests to run with or without a live backend.

## Architecture Overview

### Deployment Model
- **Static hosting** on GitHub Pages (no build step; `.html` files served as-is)
- **Backend URL** detected dynamically via [js/config.js](js/config.js):
  - Development: `http://localhost:3000` (local backend)
  - Production: Lambda URL from `CONFIG.BACKEND_BASE` constant
- **No bundler** (Webpack/Vite/Parcel); direct `.html` file execution
- **Authentication**: JWT tokens stored in `sessionStorage` (browsers) or `localStorage` (Android WebView)

### Page Structure
Each service has a dedicated HTML file with embedded inline JavaScript:
- `index.html` — Main booking/landing page
- `bat-knocking.html` — Bat servicing form + payment
- `stringing-booking.html` — Racket stringing form + payment
- `trophies-shop.html` — Trophy catalog, cart, and checkout
- `payment-success.html` — Order confirmation page
- `staff-dashboard.html` — Staff QR scanner interface + status updates
- `qr-scanner.html` — QR code scanning (used in iframe within dashboard)

### Backend Integration Pattern
All API calls follow this structure:
```javascript
const response = await fetch(`${window.CONFIG.BACKEND_BASE}/api/create-order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customerName, phone, store, serviceType, ... })
});
const data = await response.json();
```

**URL Parameter for Test Mode**: Add `?test=true` to bypass Zoho payment widget and use mock responses.

## Critical Frontend Patterns

### Config Loading (`js/config.js`)
```javascript
// Detects environment and exports global CONFIG object
window.CONFIG = {
  BACKEND_BASE: 'http://localhost:3000' | 'https://lambda-url...',
  ZOHO_WIDGET_API_KEY: '...'  // Hardcoded; safe for GitHub Pages public repo
};
```
- **Always use** `window.CONFIG.BACKEND_BASE` for API calls (never hardcode localhost/Lambda URLs)
- **Dev detection**: If hostname is `localhost` or `127.0.0.1`, use `:3000`
- **Prod fallback**: Use hardcoded Lambda URL as constant

### Authentication Storage (Android WebView Compatibility)
```javascript
// Use platform-aware storage based on environment
const storage = isAndroidWebView ? localStorage : sessionStorage;
storage.setItem('authToken', jwtToken);

// When making API calls:
headers: { 'Authorization': `Bearer ${storage.getItem('authToken')}` }
```
**Why two storage types**: Browser sessions are temporary; Android WebView persists across app restarts, so needs `localStorage`.
See [tests/e2e/platform-auth-storage.spec.ts](../tests/e2e/platform-auth-storage.spec.ts) for test pattern.

### Form Submission & Zoho Payment Widget
```javascript
// After POST /api/create-order response:
if (data.payments_session_id) {
  // Customer needs to pay via Zoho widget
  const zohoWidget = new ZohoDCKG.DCKGPageView({
    pageId: data.payments_session_id,
    apiKey: window.CONFIG.ZOHO_WIDGET_API_KEY
  });
  zohoWidget.render(containerId);  // Embed in page
} else if (data.paymentMethod === 'payatoutlet') {
  // Customer pays at outlet; redirect immediately
  window.location.href = `payment-success.html?orderId=${data.orderId}`;
}
```

### Cart & Local Storage (Trophies Shop)
```javascript
// Trophy cart persists across page reloads
const cart = JSON.parse(localStorage.getItem('trophy-cart') || '[]');
cart.push({ name: 'Trophy ABC', price: 500, quantity: 1 });
localStorage.setItem('trophy-cart', JSON.stringify(cart));

// On checkout:
const cartItems = JSON.parse(localStorage.getItem('trophy-cart'));
const trophyDetails = cartItems.map(({ name, price, quantity }) => ({ name, price, quantity }));
```

### QR Scanning Workflow (Staff Dashboard)
1. **Staff login** with hardcoded credentials (`staff` / `test-password-123`)
2. **JWT token** received; stored in `localStorage`
3. **QR scanner** loaded in iframe (`qr-scanner.html`)
4. **On QR scan**: POST `/api/qr/:code/link` to associate with item
5. **Dashboard polls** `/api/qr/unlinked/orders` for pending items every 3-5 seconds
6. **Status update** (PATCH `/api/orders/:id/status-by-racket/:racketId`) requires staff auth

### Trophy Image Upload (Preview Before Order)
```javascript
// Image upload happens on form (no server yet):
const file = inputElement.files[0];
const reader = new FileReader();
reader.onload = (e) => {
  const preview = document.getElementById('preview');
  preview.src = e.target.result;  // Data URL, NOT uploaded to server yet
  preview.dataset.file = file;    // Store File object for later
};

// On order creation, pass files array:
const formData = new FormData();
storedFiles.forEach(file => formData.append('images', file));
// Backend (Multer) handles S3 upload and returns imageUrls
```

### Conditional UI Rendering (Trophy Delivery)
```javascript
// Show delivery address ONLY if deliveryType === 'porter'
const deliveryType = document.getElementById('deliveryType').value;
const addressSection = document.getElementById('deliveryAddressSection');
addressSection.style.display = (deliveryType === 'porter') ? 'block' : 'none';

// On form submission, include deliveryAddress only if 'porter':
const payload = {
  ...baseOrder,
  deliveryType,
  deliveryAddress: deliveryType === 'porter' ? formData.deliveryAddress : null
};
```

### Advance Payment Split (Trophies Only)
When customer checks "Pay 50% now, rest on completion":
```javascript
// Response from POST /api/create-order includes:
{
  advancePayment: true,
  payNowAmount: 500,      // ₹500 now
  balanceAmount: 500      // ₹500 later (after order completion)
}

// Frontend displays:
// "Pay ₹500 now, remaining ₹500 when your order is ready"
```

## Testing Patterns

### Playwright E2E Tests (`tests/e2e/*.spec.ts`)

**Basic Test Structure:**
```typescript
import { test, expect } from '@playwright/test';

test('creates bat order and navigates to payment', async ({ page }) => {
  // Test mode skips Zoho payment integration
  await page.goto('/bat-knocking.html?test=true');
  
  await page.locator('#customerName').fill('John Doe');
  await page.locator('#phone').fill('9876543210');
  await page.locator('#paymentMethod').selectOption('payatoutlet');
  
  // Mock backend response (automatic in test mode)
  await page.locator('#submitBtn').click();
  
  // Verify redirect or response
  await expect(page).toHaveURL(/payment-success/);
});
```

**Key Patterns:**
- Use `?test=true` URL parameter to skip real payment flows
- Selectors are typically `#id` (IDs on form elements)
- Always test with `BACKEND_RUNNING=false` (default) to isolate UI from backend
- For integration tests: use `BACKEND_RUNNING=true npm test` to hit live backend

**Running Tests:**
```bash
npm test                       # All tests, headless
npm test:headed               # Show browser
npm test -- bat-knocking      # Run specific test file
BACKEND_RUNNING=true npm test # Use localhost:3000 backend (requires backend running)
```

### Test Environment Detection
- **Playwright auto-detects** `BACKEND_RUNNING` env var
- **If not set** (default): Starts `http-server` on :5173 automatically
- **If set to true**: Skips webserver startup; points to existing localhost:3000

## Development Workflows

### Local Development (No Backend Running)
```bash
npm test:headed  # Runs headless Playwright + auto-starts :5173 webserver
# In browser: Opens http://localhost:5173/bat-knocking.html?test=true
# Backend calls mocked/blocked (network isolation)
```

### Integration Testing (With Live Backend)
```bash
# Terminal 1: Start backend
cd ../backend-process-payments && npm run dev

# Terminal 2: Run frontend tests against live backend
BACKEND_RUNNING=true npm test:headed
```

### Manual Testing (Development Server)
```bash
# Terminal 1: Start simple HTTP server
npx http-server . -p 5173

# Terminal 2: Browser (manually navigate)
# Open: http://localhost:5173/bat-knocking.html
```

## Critical Files & Their Patterns

| File | Key Responsibility |
|------|-------------------|
| [js/config.js](js/config.js) | Backend URL detection, Zoho widget API key |
| [bat-knocking.html](bat-knocking.html) | Bat servicing form; references BAT pricing table in comments |
| [stringing-booking.html](stringing-booking.html) | Racket stringing form; pricing logic for express/standard |
| [trophies-shop.html](trophies-shop.html) | Trophy catalog fetch, cart management, bulk discount UI |
| [staff-dashboard.html](staff-dashboard.html) | JWT login, QR scanner iframe, polling `/api/qr/unlinked/orders` |
| [qr-scanner.html](qr-scanner.html) | Camera input, QR code detection, POST `/api/qr/:code/link` |
| [payment-success.html](payment-success.html) | Order confirmation; polls `/api/orders/:id` for payment status |

## Data Flows

### Order Creation → Payment Confirmation
1. **User submits form** (bat-knocking.html, trophies-shop.html, etc.)
2. **Frontend calculates total** (frontend math for display only; backend validates)
3. **POST `/api/create-order`** sends order data
4. **Backend response** contains either:
   - `payments_session_id` → Show Zoho widget for payment
   - `success: true` + `orderId` → Redirect to `payment-success.html`
5. **Payment webhook** from Zoho updates order status (backend updates MongoDB)
6. **Frontend polls** `GET /api/orders/:id` on success page to show "Payment Confirmed"

### QR Linking for Item Status Tracking
1. **POST `/api/qr/:code/link`** associates QR code with specific item ID
2. **GET `/api/qr/unlinked/orders`** fetches unlinked items (staff dashboard)
3. **PATCH `/api/orders/:id/status-by-racket/:racketId`** updates individual item status
4. **GET `/api/orders/:id`** shows updated status (racket 0→1→2)

## Key Conventions

- **Phone normalization**: Always strip non-digits before API calls (backend also validates)
- **Test mode**: `?test=true` URL param prevents Zoho integration (for headless testing)
- **JWT storage**: Use `localStorage` for Android WebView; `sessionStorage` for browser
- **Cart persistence**: Trophy cart stored in `localStorage` (survives page reloads)
- **Backend URL**: Always fetch from `window.CONFIG.BACKEND_BASE` (set once at startup)
- **Error handling**: API errors returned in response; display user-friendly messages (never expose stack traces)

## Common Issues & Solutions

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| "Backend not responding" on test | Backend not running + `BACKEND_RUNNING=false` | Set `BACKEND_RUNNING=true` and start backend (`npm run dev` in backend folder) |
| "Cannot read property 'BACKEND_BASE' of undefined" | `config.js` not loaded before other scripts | Ensure `<script src="js/config.js"></script>` is first in HTML `<head>` |
| Zoho payment widget not showing | API key incorrect or session ID missing | Verify `ZOHO_WIDGET_API_KEY` in config.js; check response has `payments_session_id` |
| QR scanner won't open camera | Browser permissions denied | User must grant camera access in browser security prompt |
| Cart empty after page reload | Using `sessionStorage` instead of `localStorage` | Always use `localStorage` for trophy cart persistence |
| Auth token lost after Android app restart | Token in `sessionStorage` | For Android WebView, store in `localStorage` (see platform-auth-storage.spec.ts) |
| Tests timeout on Playwright | Webserver didn't start or network blocking active | Check logs; ensure port 5173 available; disable VPN if blocking localhost |

## Environment & Configuration

### No `.env` File Needed
Frontend has no `.env` file. All config is in [js/config.js](js/config.js):
```javascript
const CONFIG = {
  BACKEND_BASE: getBackendUrl(),              // Auto-detects localhost vs Lambda
  ZOHO_WIDGET_API_KEY: '...'                  // Hardcoded constant (safe for GitHub Pages)
};
```

### For GitHub Pages Deployment
- No build step required
- Just push `.html` files to `main` branch
- GitHub Pages auto-serves them at `https://dasportz.com`
- DNS CNAME points to GitHub Pages (see [CNAME](CNAME) file)

## Cross-App Communication

**Frontend → Backend via REST API:**
- All requests to `${window.CONFIG.BACKEND_BASE}/api/*`
- CORS handled by backend (Lambda.js includes `getCorsOrigin()`)
- JWT tokens sent in `Authorization: Bearer <token>` header

**Backend → Frontend:**
- Webhook responses are asynchronous (Zoho → backend → Twilio → customer)
- Frontend polls for status updates (`GET /api/orders/:id`)
- No reverse connection (backend never calls frontend)

## Quick Reference: Service Routes

| Service | Files | API Endpoint | Key Fields |
|---------|-------|--------------|-----------|
| Bat Knocking | bat-knocking.html | `/api/create-order` | `batDetails`, `serviceType: 'bat-knocking'`, `paymentMethod` |
| Racket Stringing | stringing-booking.html | `/api/create-order` | `racketDetails`, `serviceType: 'racket-stringing'`, `express` |
| Trophies | trophies-shop.html | `/api/create-order` | `trophyDetails`, `deliveryType`, `advancePayment` |
| Staff QR | staff-dashboard.html + qr-scanner.html | `/api/qr/unlinked/orders` | JWT auth required |
| Payment Confirmation | payment-success.html | `GET /api/orders/:id` | Polls every 3-5s for `paymentStatus: 'paid'` |

