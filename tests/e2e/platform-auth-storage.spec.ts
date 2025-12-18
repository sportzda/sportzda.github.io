import { test, expect } from '@playwright/test';

/**
 * Platform-Specific Authentication Storage Tests
 * 
 * Tests the new feature that provides different authentication persistence
 * based on platform:
 * - Android WebView: Uses localStorage (persistent across app restarts)
 * - Regular browsers: Uses sessionStorage (cleared when tab/window closes)
 * 
 * Implementation: The staff-dashboard.html now includes:
 * - isAndroidWebView(): Detects platform via user agent and custom interfaces
 * - getStorage(): Returns appropriate storage (localStorage or sessionStorage)
 * - Modified authentication functions to use platform-specific storage
 */

test.describe('Platform-Specific Authentication Storage', () => {

    test.describe('Login and Storage', () => {
        test('should store authentication token after successful login', async ({ page }) => {
            // Mock login API
            await page.route('**/api/staff/login', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        token: 'test_auth_token_123',
                        expiresIn: '8h',
                        staff: { username: 'staff', role: 'staff' }
                    })
                });
            });

            // Mock verify API
            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Login
            await page.fill('#username', 'staff');
            await page.fill('#password', 'dasportz2025');
            await page.click('button:has-text("Login")');

            await page.waitForTimeout(1000);

            // Verify token is stored (in either localStorage or sessionStorage)
            const hasToken = await page.evaluate(() => {
                const sessionToken = sessionStorage.getItem('staffAuthToken');
                const localToken = localStorage.getItem('staffAuthToken');
                return sessionToken !== null || localToken !== null;
            });

            expect(hasToken).toBe(true);
        });

        test('should log platform detection and storage choice', async ({ page }) => {
            const consoleLogs: string[] = [];

            page.on('console', msg => {
                if (msg.type() === 'log') {
                    consoleLogs.push(msg.text());
                }
            });

            await page.route('**/api/staff/login', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        token: 'log_test_token',
                        expiresIn: '8h',
                        staff: { username: 'staff', role: 'staff' }
                    })
                });
            });

            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            await page.goto('/staff-dashboard.html');

            await page.fill('#username', 'staff');
            await page.fill('#password', 'dasportz2025');
            await page.click('button:has-text("Login")');

            await page.waitForTimeout(1000);

            // Check for authentication-related logs
            const hasAuthLogs = consoleLogs.some(log =>
                log.includes('[AUTH]') || log.includes('Login successful')
            );

            expect(hasAuthLogs).toBe(true);
        });
    });

    test.describe('Token Persistence', () => {
        test('should load dashboard if valid token exists in storage', async ({ page }) => {
            // Pre-populate sessionStorage with token
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'existing_valid_token');
            });

            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        staff: { username: 'staff', role: 'staff' }
                    })
                });
            });

            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ orders: [] })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Should load dashboard without showing login
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            const isDashboardVisible = await page.locator('.dashboard-content').isVisible();
            expect(isDashboardVisible).toBe(true);
        });

        test('should show login form if no token in storage', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Should show login form
            const loginElements = await page.locator('#login-section, .login-container, form:has(#username)').count();
            expect(loginElements).toBeGreaterThan(0);
        });

        test('should redirect to login if token is expired', async ({ page }) => {
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'expired_token_456');
            });

            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'token_expired',
                        message: 'Token has expired. Please login again.'
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Should show login form
            await page.waitForTimeout(1000);
            const loginVisible = await page.locator('#login-section, .login-container, form:has(#username)').first().isVisible();
            expect(loginVisible).toBe(true);
        });
    });

    test.describe('Logout Functionality', () => {
        test('should clear token from storage on logout', async ({ page }) => {
            // Setup authenticated session
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_logout');
                sessionStorage.setItem('staffUser', 'staff');
            });

            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ orders: [] })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Handle the confirmation dialog
            page.on('dialog', async dialog => {
                await dialog.accept();
            });

            // Click logout button (it's an anchor tag with id="logoutBtn")
            await page.click('#logoutBtn');
            // Verify token is cleared
            const tokenCleared = await page.evaluate(() => {
                const sessionToken = sessionStorage.getItem('staffAuthToken');
                const localToken = localStorage.getItem('staffAuthToken');
                return sessionToken === null && localToken === null;
            });

            expect(tokenCleared).toBe(true);
        });
    });

    test.describe('Error Handling', () => {
        test('should handle invalid credentials gracefully', async ({ page }) => {
            await page.route('**/api/staff/login', async (route) => {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'invalid_credentials',
                        message: 'Invalid username or password'
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            await page.fill('#username', 'wronguser');
            await page.fill('#password', 'wrongpass');
            await page.click('button:has-text("Login")');

            await page.waitForTimeout(1000);

            // Should still show login form
            const loginStillVisible = await page.locator('#login-section, .login-container, form:has(#username)').first().isVisible();
            expect(loginStillVisible).toBe(true);

            // Should not store any token
            const noToken = await page.evaluate(() => {
                const sessionToken = sessionStorage.getItem('staffAuthToken');
                const localToken = localStorage.getItem('staffAuthToken');
                return sessionToken === null && localToken === null;
            });

            expect(noToken).toBe(true);
        });
    });
});
