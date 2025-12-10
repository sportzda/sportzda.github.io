import { test, expect, Page } from '@playwright/test';

test.describe('Staff Dashboard Tests', () => {
    test.describe('Bat-Knocking Order Display', () => {
        test('Should not display threading when threading is "none"', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

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
                                        package: '10000',
                                        threading: 'none',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            // Navigate to bat-knocking tab to trigger the display
            await page.click('text=Bat Knocking');
            await page.waitForTimeout(500); // Wait for render

            // Check that the order card shows only the package without threading
            const itemMeta = page.locator('.item-meta').first();
            const text = await itemMeta.textContent();

            // Should show "10000" (package) but NOT "none"
            expect(text).toContain('10000');
            expect(text).not.toContain('none');
        });

        test('Should display threading text when threading is present', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

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
                                        package: '15000',
                                        threading: 'both',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            // Navigate to bat-knocking tab
            await page.click('text=Bat Knocking');
            await page.waitForTimeout(500);

            // Check that the order card shows package AND threading
            const itemMeta = page.locator('.item-meta').first();
            const text = await itemMeta.textContent();

            // Should show both "15000" and "both"
            expect(text).toContain('15000');
            expect(text).toContain('both');
            expect(text).toMatch(/15000.*both/); // Both should be present
        });

        test('Should show different threading types correctly', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

            const threadingTypes = ['top', 'bottom', 'both', 'top+bottom'];

            for (const threading of threadingTypes) {
                // Mock the orders API with current threading type
                await page.route('**/api/orders*', async (route) => {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            orders: [
                                {
                                    orderId: `DA_TEST_${threading}`,
                                    customerName: 'Test Customer',
                                    phone: '9999999992',
                                    store: 'Test Store',
                                    serviceType: 'bat-knocking',
                                    createdAt: new Date().toISOString(),
                                    paymentStatus: 'pending',
                                    batDetails: [
                                        {
                                            batModel: 'MRF Grand',
                                            package: '20000',
                                            threading: threading,
                                            qty: 1
                                        }
                                    ]
                                }
                            ]
                        })
                    });
                });

                // Navigate to bat-knocking tab
                await page.click('text=Bat Knocking');
                await page.waitForTimeout(500);

                // Check that the exact threading text is displayed
                const itemMeta = page.locator('.item-meta').first();
                const text = await itemMeta.textContent();
                expect(text).toContain(threading);
            }
        });

        test('Should not show threading field in View Details modal when threading is "none"', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

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
                                        package: '10000',
                                        threading: 'none',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            // Navigate to bat-knocking and click View Details
            await page.click('text=Bat Knocking');
            await page.waitForTimeout(500);
            await page.click('button:has-text("View Details")');
            await page.waitForTimeout(300);

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
            await page.goto('/staff-dashboard.html');

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
                                        package: '15000',
                                        threading: 'both',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            // Navigate to bat-knocking and click View Details
            await page.click('text=Bat Knocking');
            await page.waitForTimeout(500);
            await page.click('button:has-text("View Details")');
            await page.waitForTimeout(300);

            // Check that Threading row IS in the modal with correct value
            const modal = page.locator('[role="dialog"]').first();
            const modalText = await modal.textContent();

            // Should contain "Threading" label with exact value
            expect(modalText).toContain('Threading');
            expect(modalText).toContain('both');
            // And should still contain other fields
            expect(modalText).toContain('SS TON');
            expect(modalText).toContain('15000');
        });

        test('Should display multiple bat cards with different threading states', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

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
                                        package: '10000',
                                        threading: 'none',
                                        qty: 1
                                    },
                                    {
                                        batModel: 'SS TON',
                                        package: '15000',
                                        threading: 'top',
                                        qty: 1
                                    },
                                    {
                                        batModel: 'SG Willow',
                                        package: '20000',
                                        threading: 'both',
                                        qty: 1
                                    }
                                ]
                            }
                        ]
                    })
                });
            });

            // Navigate to bat-knocking tab
            await page.click('text=Bat Knocking');
            await page.waitForTimeout(500);

            // Get all order cards
            const cards = await page.locator('.order-card').all();
            expect(cards.length).toBe(3); // Should have 3 cards (one for each bat)

            // Check first card (no threading)
            const itemMeta1 = cards[0].locator('.item-meta');
            const text1 = await itemMeta1.textContent();
            expect(text1).toContain('10000');
            expect(text1).not.toContain('none');

            // Check second card (with top threading)
            const itemMeta2 = cards[1].locator('.item-meta');
            const text2 = await itemMeta2.textContent();
            expect(text2).toContain('15000');
            expect(text2).toContain('top');

            // Check third card (with both threading)
            const itemMeta3 = cards[2].locator('.item-meta');
            const text3 = await itemMeta3.textContent();
            expect(text3).toContain('20000');
            expect(text3).toContain('both');
        });
    });

    test.describe('Racket-Stringing Order Display', () => {
        test('Should display racket details correctly', async ({ page }) => {
            await page.goto('/staff-dashboard.html');

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
});
