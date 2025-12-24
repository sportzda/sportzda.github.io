import { test, expect, Page } from '@playwright/test';

test.describe('Staff Dashboard Tests', () => {
    test.describe('Bat-Knocking Order Display', () => {
        test('Should not display threading when threading is "none"', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API to return bat-knocking order with no threading
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST001',
                                customerName: 'Test Customer',
                                phone: '9999999990',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'MRF Grand',
                                        cost: 10000,
                                        threading: 'none',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500); // Let render complete

            // Navigate to bat-knocking tab to trigger the display
            await page.click('text=Bat Knocking');

            // Wait for the service to switch and data to load
            await page.waitForTimeout(2000);

            // Wait for order cards to be visible
            await expect(page.locator('.order-card')).toBeVisible({ timeout: 5000 });

            // Check that the order card shows the cost
            const orderCard = page.locator('.order-card').first();
            const cardText = await orderCard.textContent();

            // Should show "10000" (cost) 
            expect(cardText).toContain('10000');

            // Check that threading is not displayed in item-meta (should be empty)
            const itemMeta = page.locator('.item-meta').first();
            const threadingText = await itemMeta.textContent();
            expect(threadingText?.trim()).toBe('');
        });

        test('Should display threading text when threading is present', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API to return bat-knocking order with "both" threading
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST002',
                                customerName: 'Test Customer',
                                phone: '9999999991',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'SS TON',
                                        cost: 15000,
                                        threading: 'both',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Navigate to bat-knocking tab
            await page.click('text=Bat Knocking');

            // Wait for order cards to be visible
            await expect(page.locator('.order-card')).toBeVisible({ timeout: 5000 });

            // Check that the order card shows cost
            const orderCard = page.locator('.order-card').first();
            const cardText = await orderCard.textContent();
            expect(cardText).toContain('15000');

            // Check that threading is displayed in item-meta
            const itemMeta = page.locator('.item-meta').first();
            const threadingText = await itemMeta.textContent();
            expect(threadingText).toContain('Threading both');
        });

        test('Should show different threading types correctly', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with different threading types
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST_TOP',
                                customerName: 'Test Customer',
                                phone: '9999999992',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'MRF Grand',
                                        cost: 10000,
                                        threading: 'top',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Navigate to bat-knocking tab
            await page.click('text=Bat Knocking');

            // Wait for order cards and metadata to appear
            await page.waitForSelector('.order-card', { timeout: 10000 });
            await page.waitForSelector('.item-meta', { timeout: 10000 });

            // Check that the threading text is displayed with 'Threading' prefix
            const itemMeta = page.locator('.item-meta').first();
            const text = await itemMeta.textContent();
            expect(text).toContain('Threading top');
        });

        test('Should not show threading field in View Details modal when threading is "none"', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST003',
                                customerName: 'Test Customer',
                                phone: '9999999993',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'MRF Grand',
                                        cost: 10000,
                                        threading: 'none',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Navigate to bat-knocking and click View Details
            await page.click('text=Bat Knocking');

            // Wait for order cards to be visible
            await expect(page.locator('.order-card')).toBeVisible({ timeout: 5000 });

            await page.click('button:has-text("View Details")');
            await page.waitForTimeout(500); // Let modal appear

            // Check that Threading row is NOT in the modal
            const modal = page.locator('[role="dialog"]').first();
            const modalText = await modal.textContent();

            // Should NOT contain "Threading" label when value is "none"
            expect(modalText).not.toMatch(/Threading\s*none/i);
            // But should contain Model and Package
            expect(modalText).toContain('MRF Grand');
            expect(modalText).toContain('10000');
        });

        test('Should show threading field in View Details modal when threading is present', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with threading
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST004',
                                customerName: 'Test Customer',
                                phone: '9999999994',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'SS TON',
                                        cost: 15000,
                                        threading: 'both',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Navigate to bat-knocking and click View Details
            await page.click('text=Bat Knocking');

            // Wait for order cards to be visible
            await expect(page.locator('.order-card')).toBeVisible({ timeout: 5000 });

            await page.click('button:has-text("View Details")');
            await page.waitForTimeout(500); // Let modal appear

            // Check that Threading row IS in the modal with correct value
            const modal = page.locator('[role="dialog"]').first();
            const modalText = await modal.textContent();

            // Should contain "Threading" label with "Threading both" value
            expect(modalText).toContain('Threading');
            expect(modalText).toContain('Threading both');
            // And should still contain other fields
            expect(modalText).toContain('SS TON');
            expect(modalText).toContain('15000');
        });

        test('Should display multiple bat cards with different threading states', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with multiple bats having different threading
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_TEST005',
                                customerName: 'Test Customer',
                                phone: '9999999995',
                                store: 'Test Store',
                                serviceType: 'bat-knocking',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                batDetails: [
                                    {
                                        batModel: 'MRF Grand',
                                        cost: 10000,
                                        threading: 'none',
                                        qty: 1,
                                        status: 0 // received
                                    },
                                    {
                                        batModel: 'SS TON',
                                        cost: 15000,
                                        threading: 'top',
                                        qty: 1,
                                        status: 0 // received
                                    },
                                    {
                                        batModel: 'SG KLR',
                                        cost: 20000,
                                        threading: 'both',
                                        qty: 1,
                                        status: 0 // received
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Navigate to bat-knocking tab
            await page.click('text=Bat Knocking');

            // Wait for order cards to appear
            await page.waitForSelector('.order-card', { timeout: 10000 });
            await page.waitForTimeout(500); // Let all cards render

            // Get all order cards from the active "Received" tab only
            const cards = await page.locator('#received .order-card').all();
            expect(cards.length).toBe(3); // Should have 3 cards (one for each bat)

            // Check first card (no threading - should have empty item-meta)
            const itemMeta1 = cards[0].locator('.item-meta');
            const text1 = await itemMeta1.textContent();
            expect(text1?.trim()).toBe(''); // Should be empty when threading is 'none'

            // But the card should contain the cost
            const card1Text = await cards[0].textContent();
            expect(card1Text).toContain('10000');

            // Check second card (with top threading)
            const itemMeta2 = cards[1].locator('.item-meta');
            const text2 = await itemMeta2.textContent();
            expect(text2).toContain('Threading top');

            const card2Text = await cards[1].textContent();
            expect(card2Text).toContain('15000');

            // Check third card (with both threading)
            const itemMeta3 = cards[2].locator('.item-meta');
            const text3 = await itemMeta3.textContent();
            expect(text3).toContain('Threading both');

            const card3Text = await cards[2].textContent();
            expect(card3Text).toContain('20000');
        });
    });

    test.describe('Racket-Stringing Order Display', () => {
        test('Should display racket details correctly', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API for racket-stringing
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_RACKET001',
                                customerName: 'Test Customer',
                                phone: '9999999996',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'pending',
                                racketDetails: [
                                    {
                                        racketName: 'Yonex Astrox 99',
                                        string: 'Yonex BG 65',
                                        tension: '26 lbs',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });

            // Navigate to racket-stringing tab (default)
            await page.waitForTimeout(300);

            // Check that racket details are displayed
            const itemCard = page.locator('.item-card').first();
            const text = await itemCard.textContent();

            expect(text).toContain('Yonex Astrox 99');
            expect(text).toContain('Yonex BG 65');
            expect(text).toContain('26 lbs');
        });
    });

    test.describe('Racket Cost Calculation with Quantity', () => {
        test('Should display cost multiplied by quantity for single racket', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with a racket having qty > 1
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_QTY001',
                                customerName: 'Test Customer',
                                phone: '9999999997',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                paymentMethod: 'Cash',
                                racketDetails: [
                                    {
                                        id: 'racket_1',
                                        racketName: 'Yonex Astrox 99',
                                        string: 'Yonex BG 65',
                                        tension: '26',
                                        qty: 3,
                                        cost: 200,  // Cost per racket
                                        status: 0
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Check that quantity is displayed in item-meta
            const itemMeta = page.locator('.item-meta').first();
            const metaText = await itemMeta.textContent();
            expect(metaText).toContain('Qty: 3');

            // Check that the total cost is displayed (200 * 3 = 600)
            const orderTotal = page.locator('.order-total').first();
            const totalText = await orderTotal.textContent();
            expect(totalText).toContain('₹600');
        });

        test('Should display correct cost for qty=1 (default)', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with a racket having qty = 1
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_QTY002',
                                customerName: 'Test Customer',
                                phone: '9999999998',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                paymentMethod: 'Zoho',
                                racketDetails: [
                                    {
                                        id: 'racket_2',
                                        racketName: 'Babolat Pure Drive',
                                        string: 'Babolat RPM Blast',
                                        tension: '55',
                                        qty: 1,
                                        cost: 950,
                                        status: 0
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Check that quantity is displayed
            const itemMeta = page.locator('.item-meta').first();
            const metaText = await itemMeta.textContent();
            expect(metaText).toContain('Qty: 1');

            // Check that the cost is displayed correctly (950 * 1 = 950)
            const orderTotal = page.locator('.order-total').first();
            const totalText = await orderTotal.textContent();
            expect(totalText).toContain('₹950');
        });

        test('Should handle missing qty field (default to 1)', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with a racket without qty field
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_QTY003',
                                customerName: 'Test Customer',
                                phone: '9999999999',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                paymentMethod: 'AX',
                                racketDetails: [
                                    {
                                        id: 'racket_3',
                                        racketName: 'Wilson Pro Staff',
                                        string: 'Tennis String',
                                        tension: '50',
                                        // qty field missing
                                        cost: 300,
                                        status: 0
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Check that quantity defaults to 1
            const itemMeta = page.locator('.item-meta').first();
            const metaText = await itemMeta.textContent();
            expect(metaText).toContain('Qty: 1');

            // Check that the cost is displayed correctly (300 * 1 = 300)
            const orderTotal = page.locator('.order-total').first();
            const totalText = await orderTotal.textContent();
            expect(totalText).toContain('₹300');
        });

        test('Should use cost field when price is not available', async ({ page }) => {
            // Mock authentication
            await page.addInitScript(() => {
                sessionStorage.setItem('staffAuthToken', 'test_token_123');
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

            // Mock the orders API with racket having only cost field
            await page.route('**/api/orders*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        orders: [
                            {
                                orderId: 'DA_QTY004',
                                customerName: 'Test Customer',
                                phone: '9999999995',
                                store: 'Test Store',
                                serviceType: 'racket-stringing',
                                createdAt: new Date().toISOString(),
                                paymentStatus: 'paid',
                                paymentMethod: 'Cash',
                                racketDetails: [
                                    {
                                        id: 'racket_4',
                                        racketName: 'Head Sonic Pro',
                                        string: 'Badminton String',
                                        tension: '24',
                                        qty: 2,
                                        cost: 180,  // Only cost, no price
                                        status: 0
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            await page.goto('/staff-dashboard.html');

            // Wait for dashboard to load
            await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
            await page.waitForTimeout(500);

            // Check that the total cost is displayed correctly (180 * 2 = 360)
            const orderTotal = page.locator('.order-total').first();
            const totalText = await orderTotal.textContent();
            expect(totalText).toContain('₹360');
        });
    });
});
