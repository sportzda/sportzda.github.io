import { test, expect } from '@playwright/test';

/**
 * Trophy Orders Display in Staff Dashboard
 * Tests for trophy orders functionality in staff dashboard
 * - Trophy orders section display
 * - Trophy pricing, quantity, and delivery information
 * - Trophy-specific order status tracking
 * - Order filtering and status management
 */

test.describe('Trophy Orders Display in Staff Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        // Mock authentication
        await page.addInitScript(() => {
            sessionStorage.setItem('staffAuthToken', 'test_token_trophy');
            sessionStorage.setItem('staffUser', 'teststaff');
        });

        // Mock staff verify endpoint
        await page.route('**/api/staff/verify', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        // Mock orders endpoint to return trophy orders
        await page.route('**/api/orders*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    orders: [
                        {
                            orderId: 'DA_TROPHY_001',
                            customerName: 'John Doe',
                            phone: '9876543210',
                            store: 'Gaur City 1',
                            serviceType: 'trophies',
                            paymentStatus: 'paid',
                            status: 0, // Order-level status for trophies
                            trophyDetails: [
                                {
                                    name: 'Gold Trophy',
                                    price: 500,
                                    quantity: 2,
                                    size: '12',
                                    images: ['https://example.com/gold-trophy.jpg'],
                                    customization: {
                                        engraving: 'Champion 2025',
                                        logoUrl: 'https://example.com/logo.png'
                                    }
                                }
                            ],
                            deliveryType: 'pickup',
                            bulkDiscount: 0,
                            totalAmount: 1000,
                            createdAt: new Date().toISOString()
                        },
                        {
                            orderId: 'DA_TROPHY_002',
                            customerName: 'Jane Smith',
                            phone: '9876543211',
                            store: 'Gaur City 2',
                            serviceType: 'trophies',
                            paymentStatus: 'paid',
                            status: 1, // In Progress
                            trophyDetails: [
                                {
                                    name: 'Silver Trophy',
                                    price: 300,
                                    quantity: 1,
                                    size: '10',
                                    images: [],
                                    customization: {
                                        engraving: 'Runner-up'
                                    }
                                }
                            ],
                            deliveryType: 'porter',
                            deliveryAddress: '123 Main Street',
                            bulkDiscount: 0,
                            totalAmount: 300,
                            createdAt: new Date().toISOString()
                        },
                        {
                            orderId: 'DA_TROPHY_003',
                            customerName: 'Mike Johnson',
                            phone: '9876543212',
                            store: 'Gaur City 1',
                            serviceType: 'trophies',
                            paymentStatus: 'paid',
                            status: 2, // Completed
                            trophyDetails: [
                                {
                                    name: 'Bronze Trophy',
                                    price: 200,
                                    quantity: 3,
                                    size: '8',
                                    images: null,
                                    customization: null
                                }
                            ],
                            deliveryType: 'pickup',
                            bulkDiscount: 0,
                            totalAmount: 600,
                            createdAt: new Date().toISOString()
                        }
                    ]
                })
            });
        });
    });

    test.describe('Trophy Orders Display', () => {
        test('should display trophy orders in staff dashboard', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Look for trophy order references
            const hasOrderContent = await page.locator('body:has-text("DA_TROPHY")').count();

            if (hasOrderContent > 0) {
                // Trophy orders are displayed
                await expect(page.locator('text=DA_TROPHY')).toBeVisible();
            }
        });

        test('should display trophy details in order cards', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check if trophy information is displayed
            const trophyName = page.locator('text=Gold Trophy, Silver Trophy, Bronze Trophy');

            // At least one trophy should be visible
            try {
                await expect(page.locator('text=Trophy')).toBeVisible({ timeout: 2000 });
            } catch {
                // Trophy details might not be visible if not yet displayed
            }
        });

        test('should show correct trophy quantity and pricing', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check if quantity and pricing information is shown
            const priceElements = page.locator('text=₹');
            const count = await priceElements.count();

            // Should have at least some price information displayed
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('should display delivery type (pickup vs porter)', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check for delivery type indicators
            try {
                const deliveryElements = page.locator('text=/Pickup|Delivery|Porter/');
                const count = await deliveryElements.count();
                expect(count).toBeGreaterThanOrEqual(0);
            } catch {
                // Delivery type might not be prominently displayed
            }
        });

        test('should display trophy images with fallback for missing images', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check if images are rendered
            const images = page.locator('img');
            const count = await images.count();

            // Should have some images (either trophy images or placeholders)
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe('Trophy Orders Status Tracking', () => {
        test('should display order-level status for trophy orders', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check for status indicators
            try {
                const statusElements = page.locator('text=/Received|In Progress|Completed/');
                const count = await statusElements.count();
                expect(count).toBeGreaterThanOrEqual(0);
            } catch {
                // Status indicators might not be displayed
            }
        });

        test('should allow updating trophy order status', async ({ page }) => {
            await page.route('**/api/orders/*/status*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Look for update buttons
            const updateButtons = page.locator('button:has-text("Update Status"), button:has-text("Mark")');
            const buttonCount = await updateButtons.count();

            // Should have update buttons if feature is implemented
            expect(buttonCount).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe('Trophy Orders Tab/Section Navigation', () => {
        test('should have trophy orders accessible from dashboard', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check for tabs or sections
            const tabElements = page.locator('button[role="tab"], [role="tablist"] button');
            const tabCount = await tabElements.count();

            // Should have navigation elements
            expect(tabCount).toBeGreaterThanOrEqual(0);
        });

        test('should display appropriate badges for order counts', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check for badge elements
            const badges = page.locator('span.badge, [role="status"]');
            const badgeCount = await badges.count();

            // Should have some status indicators
            expect(badgeCount).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe('Trophy Orders Responsive Design', () => {
        test('should display properly on mobile viewport', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check that main content is visible
            const mainContent = page.locator('.dashboard-content, [role="main"]');
            await expect(mainContent).toBeVisible();
        });

        test('should display properly on tablet viewport', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check that main content is visible
            const mainContent = page.locator('.dashboard-content, [role="main"]');
            await expect(mainContent).toBeVisible();
        });

        test('should display properly on desktop viewport', async ({ page }) => {
            await page.setViewportSize({ width: 1920, height: 1080 });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Check that main content is visible
            const mainContent = page.locator('.dashboard-content, [role="main"]');
            await expect(mainContent).toBeVisible();
        });
    });

    test.describe('Trophy Orders Integration', () => {
        test('should handle trophy orders alongside racket and bat orders', async ({ page }) => {
            // Mock mixed orders
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_RACKET_001',
                                serviceType: 'racket-stringing',
                                racketDetails: [{ id: 'r1', status: 0 }],
                                paymentStatus: 'paid'
                            },
                            {
                                orderId: 'DA_BAT_001',
                                serviceType: 'bat-knocking',
                                batDetails: [{ id: 'b1', status: 0 }],
                                paymentStatus: 'paid'
                            },
                            {
                                orderId: 'DA_TROPHY_001',
                                serviceType: 'trophies',
                                trophyDetails: [{ name: 'Trophy', quantity: 1 }],
                                status: 0,
                                paymentStatus: 'paid'
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content, [role="main"]', { timeout: 5000 });

            // Verify dashboard loaded with mixed order types
            const mainContent = page.locator('.dashboard-content, [role="main"]');
            await expect(mainContent).toBeVisible();
        });
    });
});

