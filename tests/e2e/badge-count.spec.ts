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
        test('should count individual bats, not orders - 2 bats in progress in 1 order', async ({ page }) => {
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

            // Verify orders mock was set up
            console.log('Orders mock registered');

            await page.waitForTimeout(1000); // Let dashboard load orders

            // Switch to bat-knocking tab using the button
            const batKnockingBtn = page.locator('button:has-text("Bat Knocking")');
            await batKnockingBtn.click();

            // Wait for the service to switch and fetch data
            await page.waitForTimeout(2000);

            // Wait for badges to update - they should change from initial state
            const inProgressBadge = page.locator('#inProgressCount');
            await expect(inProgressBadge).toHaveText('2', { timeout: 15000 });
        });

        test('should count bats correctly across multiple orders', async ({ page }) => {
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

            await page.route('**/api/orders*', async (route) => {
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
            });

            await page.goto('/staff-dashboard.html');
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(1000); // Let dashboard load orders

            // Switch to bat-knocking tab
            await page.click('text=Bat Knocking');

            // Wait for badges to update
            const receivedBadge = page.locator('#receivedCount');
            const inProgressBadge2 = page.locator('#inProgressCount');
            const completedBadge = page.locator('#completedCount');
            await expect(receivedBadge).toHaveText('1', { timeout: 15000 });

            // Received: 1, In Progress: 2, Completed: 1
            await expect(page.locator('#receivedCount')).toHaveText('1');
            await expect(page.locator('#inProgressCount')).toHaveText('2');
            await expect(page.locator('#completedCount')).toHaveText('1');
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
});
