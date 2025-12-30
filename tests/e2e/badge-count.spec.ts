import { test, expect } from '@playwright/test';

/**
 * Badge Count Tests
 * 
 * Tests to verify that tab badges (Received, In Progress, Completed) 
 * show the correct count of individual rackets/bats, not just order count.
 * 
 * Issue Fixed: Badge was showing count of orders instead of total items.
 * Example: 1 order with 2 rackets in progress should show "2", not "1"
 */

test.describe('Badge Count Tests', () => {

    test.beforeEach(async ({ page }) => {
        // Mock authentication
        await page.addInitScript(() => {
            sessionStorage.setItem('staffAuthToken', 'test_token_badge');
            sessionStorage.setItem('staffUser', 'teststaff');
        });

        // Mock authentication API
        await page.route('**/api/staff/verify', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });
    });

    test.describe('Racket Stringing - Multiple Rackets in Same Order', () => {
        test('should count individual rackets, not orders - 2 rackets in progress in 1 order', async ({ page }) => {
            // Mock orders API with 1 order containing 2 rackets both in progress (status: 1)
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_MULTI_001',
                                customerName: 'John Doe',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    {
                                        id: 'racket_1',
                                        string: 'Yonex BG 65',
                                        tension: '26',
                                        qty: 1,
                                        status: 1, // In Progress
                                        price: 550
                                    },
                                    {
                                        id: 'racket_2',
                                        string: 'Yonex BG 80',
                                        tension: '28',
                                        qty: 1,
                                        status: 1, // In Progress
                                        price: 700
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Check In Progress badge count - should be 2 (not 1)
            const inProgressBadge = page.locator('#inProgressCount');
            await expect(inProgressBadge).toHaveText('2');
        });

        test('should count correctly with mixed statuses in same order', async ({ page }) => {
            // 1 order with: 2 received (status 0), 1 in-progress (status 1), 1 completed (status 2)
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_MIXED_001',
                                customerName: 'Jane Smith',
                                phone: '9876543211',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r1', string: 'String A', tension: '26', qty: 1, status: 0, price: 500 },
                                    { id: 'r2', string: 'String B', tension: '27', qty: 1, status: 0, price: 500 },
                                    { id: 'r3', string: 'String C', tension: '28', qty: 1, status: 1, price: 600 },
                                    { id: 'r4', string: 'String D', tension: '29', qty: 1, status: 2, price: 700 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Verify each badge shows correct count
            await expect(page.locator('#receivedCount')).toHaveText('2');
            await expect(page.locator('#inProgressCount')).toHaveText('1');
            await expect(page.locator('#completedCount')).toHaveText('1');
        });
    });

    test.describe('Racket Stringing - Multiple Orders', () => {
        test('should sum rackets across multiple orders', async ({ page }) => {
            // 2 orders: Order 1 has 2 in-progress, Order 2 has 1 in-progress
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_ORDER_001',
                                customerName: 'Customer A',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r1', string: 'Yonex BG 65', tension: '26', qty: 1, status: 1, price: 550 },
                                    { id: 'r2', string: 'Yonex BG 80', tension: '28', qty: 1, status: 1, price: 700 }
                                ]
                            },
                            {
                                orderId: 'DA_ORDER_002',
                                customerName: 'Customer B',
                                phone: '9876543211',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r3', string: 'Li-Ning No.1', tension: '27', qty: 1, status: 1, price: 550 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Total should be 3 (2 from order 1 + 1 from order 2)
            await expect(page.locator('#inProgressCount')).toHaveText('3');
        });

        test('should count correctly with multiple orders having different statuses', async ({ page }) => {
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_001',
                                customerName: 'Customer A',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r1', string: 'String A', tension: '26', qty: 1, status: 0, price: 500 },
                                    { id: 'r2', string: 'String B', tension: '27', qty: 1, status: 1, price: 600 }
                                ]
                            },
                            {
                                orderId: 'DA_002',
                                customerName: 'Customer B',
                                phone: '9876543211',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r3', string: 'String C', tension: '28', qty: 1, status: 1, price: 700 },
                                    { id: 'r4', string: 'String D', tension: '29', qty: 1, status: 2, price: 800 }
                                ]
                            },
                            {
                                orderId: 'DA_003',
                                customerName: 'Customer C',
                                phone: '9876543212',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r5', string: 'String E', tension: '25', qty: 1, status: 0, price: 500 },
                                    { id: 'r6', string: 'String F', tension: '30', qty: 1, status: 2, price: 900 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Received: r1 + r5 = 2
            // In Progress: r2 + r3 = 2
            // Completed: r4 + r6 = 2
            await expect(page.locator('#receivedCount')).toHaveText('2');
            await expect(page.locator('#inProgressCount')).toHaveText('2');
            await expect(page.locator('#completedCount')).toHaveText('2');
        });
    });

    test.describe('Bat Knocking - Multiple Bats in Same Order', () => {
        test.skip('should count individual bats, not orders - 2 bats in progress in 1 order', async ({ page }) => {
            // Set default service to bat-knocking before page loads
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
                sessionStorage.setItem('staffUser', 'teststaff');
                // This won't work - currentService is set in the page script
            });

            // Mock auth verification
            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            // Mock the orders API - return bat data
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_BAT_001',
                                customerName: 'Cricket Player',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        id: 'bat_1',
                                        batModel: 'MRF Grand',
                                        ballPackage: '500',
                                        threading: 'none',
                                        status: 1, // In Progress
                                        cost: 10000
                                    },
                                    {
                                        id: 'bat_2',
                                        batModel: 'SS TON',
                                        ballPackage: '1000',
                                        threading: 'grip',
                                        status: 1, // In Progress
                                        cost: 15000
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });

            // Inject code to change service to bat-knocking
            await page.evaluate(() => {
                const btn = document.querySelector('button[data-service="bat-knocking"]');
                if (btn) btn.click();
            });

            // Wait for badges to update
            await page.waitForTimeout(3000);
            const inProgressBadge = page.locator('#inProgressCount');
            await expect(inProgressBadge).toHaveText('2', { timeout: 10000 });
        });

        test.skip('should count bats correctly across multiple orders', async ({ page }) => {
            // Mock authentication to avoid login modal
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
                sessionStorage.setItem('staffUser', 'teststaff');
            });

            // Mock auth verification
            await page.route('**/api/staff/verify', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true })
                });
            });

            // Mock the orders API - return empty for racket-stringing (default), bat data when requested
            await page.route('**/api/orders*', async (route) => {
                const url = route.request().url();
                if (url.includes('serviceType=bat-knocking')) {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            orders: [
                                {
                                    orderId: 'DA_BAT_001',
                                    customerName: 'Player A',
                                    phone: '9876543210',
                                    store: 'Test Store',
                                    serviceType: 'bat-knocking',
                                    createdAt: new Date().toISOString(),
                                    paymentStatus: 'pending',
                                    batDetails: [
                                        { id: 'b1', batModel: 'MRF', ballPackage: '500', threading: 'none', status: 0, cost: 10000 },
                                        { id: 'b2', batModel: 'SS', ballPackage: '1000', threading: 'grip', status: 1, cost: 15000 }
                                    ]
                                },
                                {
                                    orderId: 'DA_BAT_002',
                                    customerName: 'Player B',
                                    phone: '9876543211',
                                    store: 'Test Store',
                                    serviceType: 'bat-knocking',
                                    createdAt: new Date().toISOString(),
                                    paymentStatus: 'pending',
                                    batDetails: [
                                        { id: 'b3', batModel: 'SG', ballPackage: '1500', threading: 'both', status: 1, cost: 18000 },
                                        { id: 'b4', batModel: 'Kookaburra', ballPackage: '2000', threading: 'toe', status: 2, cost: 20000 }
                                    ]
                                }
                            ]
                        })
                    });
                } else {
                    // Return empty for racket-stringing (default service)
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ orders: [] })
                    });
                }
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });

            // Switch to bat-knocking tab
            const batKnockingBtn = page.locator('button:has-text("Bat Knocking")');
            await batKnockingBtn.click();

            // Wait for the service to switch and fetch data
            await page.waitForTimeout(2000);

            // Received: 1, In Progress: 2, Completed: 1
            await expect(page.locator('#receivedCount')).toHaveText('1', { timeout: 10000 });
            await expect(page.locator('#inProgressCount')).toHaveText('2', { timeout: 10000 });
            await expect(page.locator('#completedCount')).toHaveText('1', { timeout: 10000 });
        });
    });

    test.describe('Edge Cases', () => {
        test('should show 0 when no orders exist', async ({ page }) => {
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ orders: [] })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            await expect(page.locator('#receivedCount')).toHaveText('0');
            await expect(page.locator('#inProgressCount')).toHaveText('0');
            await expect(page.locator('#completedCount')).toHaveText('0');
        });

        test('should handle orders with missing status (defaults to 0)', async ({ page }) => {
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_NO_STATUS',
                                customerName: 'Test',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r1', string: 'String A', tension: '26', qty: 1, price: 500 }, // No status field
                                    { id: 'r2', string: 'String B', tension: '27', qty: 1, status: 1, price: 600 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // r1 should default to status 0 (received), r2 is status 1 (in-progress)
            await expect(page.locator('#receivedCount')).toHaveText('1');
            await expect(page.locator('#inProgressCount')).toHaveText('1');
        });

        test('should count single racket correctly (not show 0)', async ({ page }) => {
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_SINGLE',
                                customerName: 'Single Customer',
                                phone: '9876543210',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    { id: 'r1', string: 'Yonex BG 65', tension: '26', qty: 1, status: 1, price: 550 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            await expect(page.locator('#inProgressCount')).toHaveText('1');
        });
    });

    test.describe('Trophies - Order-Level Status Tracking', () => {
        test('should count trophy orders by order status, not item count', async ({ page }) => {
            // Mock orders API with 2 trophy orders: 1 received (status 0), 1 in-progress (status 1)
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
                                store: 'Test Store',
                                serviceType: 'trophies',
                                status: 0, // Received
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [
                                    { name: 'Gold Trophy', price: 500, qty: 1 },
                                    { name: 'Silver Trophy', price: 300, qty: 1 }
                                ]
                            },
                            {
                                orderId: 'DA_TROPHY_002',
                                customerName: 'Jane Smith',
                                phone: '9876543211',
                                store: 'Test Store',
                                serviceType: 'trophies',
                                status: 1, // In Progress
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [
                                    { name: 'Bronze Trophy', price: 200, qty: 1 }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load and trophies service to be selected
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Switch to Trophies service
            await page.click('button[data-service="trophies"]');
            await page.waitForTimeout(500);

            // Check badge counts - should be 1 order received, 1 order in progress
            await expect(page.locator('#receivedCount')).toHaveText('1');
            await expect(page.locator('#inProgressCount')).toHaveText('1');
            await expect(page.locator('#completedCount')).toHaveText('0');
        });

        test('should show all trophy statuses correctly', async ({ page }) => {
            // Mock orders API with trophy orders in all 3 statuses
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TROPHY_R001',
                                customerName: 'Customer 1',
                                phone: '9876543210',
                                store: 'Store 1',
                                serviceType: 'trophies',
                                status: 0, // Received
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy A', price: 500, qty: 1 }]
                            },
                            {
                                orderId: 'DA_TROPHY_IP001',
                                customerName: 'Customer 2',
                                phone: '9876543211',
                                store: 'Store 2',
                                serviceType: 'trophies',
                                status: 1, // In Progress
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy B', price: 300, qty: 1 }]
                            },
                            {
                                orderId: 'DA_TROPHY_C001',
                                customerName: 'Customer 3',
                                phone: '9876543212',
                                store: 'Store 3',
                                serviceType: 'trophies',
                                status: 2, // Completed
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy C', price: 200, qty: 1 }]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Switch to Trophies service
            await page.click('button[data-service="trophies"]');
            await page.waitForTimeout(500);

            // Check all badge counts
            await expect(page.locator('#receivedCount')).toHaveText('1');
            await expect(page.locator('#inProgressCount')).toHaveText('1');
            await expect(page.locator('#completedCount')).toHaveText('1');
        });

        test('should count multiple trophy orders in same status', async ({ page }) => {
            // Mock orders API with 3 trophy orders all with status 0 (received)
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TROPHY_M1',
                                customerName: 'Customer 1',
                                phone: '1111111111',
                                store: 'Store 1',
                                serviceType: 'trophies',
                                status: 0,
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy 1', price: 500, qty: 1 }]
                            },
                            {
                                orderId: 'DA_TROPHY_M2',
                                customerName: 'Customer 2',
                                phone: '2222222222',
                                store: 'Store 2',
                                serviceType: 'trophies',
                                status: 0,
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy 2', price: 300, qty: 2 }] // Multiple qty
                            },
                            {
                                orderId: 'DA_TROPHY_M3',
                                customerName: 'Customer 3',
                                phone: '3333333333',
                                store: 'Store 3',
                                serviceType: 'trophies',
                                status: 0,
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy 3', price: 200, qty: 1 }]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Switch to Trophies service
            await page.click('button[data-service="trophies"]');
            await page.waitForTimeout(500);

            // Should count 3 orders (not 4 items), even though order 2 has qty 2
            await expect(page.locator('#receivedCount')).toHaveText('3');
        });

        test('should handle missing status field (defaults to 0)', async ({ page }) => {
            // Mock orders API with trophy order missing status field
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TROPHY_NO_STATUS',
                                customerName: 'Customer',
                                phone: '9876543210',
                                store: 'Store',
                                serviceType: 'trophies',
                                // No status field - should default to 0
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                trophyDetails: [{ name: 'Trophy', price: 500, qty: 1 }]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content', { timeout: 5000 });

            // Switch to Trophies service
            await page.click('button[data-service="trophies"]');
            await page.waitForTimeout(500);

            // Should appear in Received (status 0)
            await expect(page.locator('#receivedCount')).toHaveText('1');
        });
    });
});
