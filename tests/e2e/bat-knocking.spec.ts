import { test, expect, Page } from '@playwright/test';

// Helper to extract BACKEND_BASE from inline script in bat-knocking.html
async function getBackendBase(page: Page): Promise<string> {
    const html = await page.content();
    const match = html.match(/const\s+BACKEND_BASE\s*=\s*['\"]([^'\"]+)['\"]/);
    if (!match) throw new Error('Could not find BACKEND_BASE in HTML');
    return match[1];
}

test.describe('Bat Knocking UI Tests', () => {
    test.describe('Form Validation', () => {
        test('Shows validation alerts for incomplete form', async ({ page }) => {
            await page.goto('/bat-knocking.html?test=true');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Click Pay Now without filling anything
            await page.locator('#confirmButton').click();

            // Verify alert shows missing fields (store and payment method have default values, so won't appear)
            expect(alertMessage).toContain('Your name');
            expect(alertMessage).toContain('WhatsApp number');
            // Payment method now has default value (online), so it won't be in missing fields
        });

        test('Validates phone number format', async ({ page }) => {
            await page.goto('/bat-knocking.html?test=true');

            // Fill everything except phone, but change payment to cash to avoid online payment flow
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#paymentMethod').selectOption('payatoutlet'); // Use cash for simpler test
            const row = page.locator('.bat-card').first();
            await row.locator('.batModel').fill('MRF Genius');
            await row.locator('.packageType').selectOption('10000');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Try invalid phone number
            await page.locator('#phone').fill('123');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Valid WhatsApp number');
            expect(alertMessage).toContain('Must be exactly 10 digits');

            // Try valid phone number
            await page.locator('#phone').fill('9876543210');
            // Mock backend response
            await page.route('**/api/create-order', route => route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
            }));
            await page.locator('#confirmButton').click();
            // Should navigate to order accepted page
            await expect(page).toHaveURL(/order-accepted\.html/);
        });

        test('Validates bat details', async ({ page }) => {
            await page.goto('/bat-knocking.html?test=true');

            // Fill basic details
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('9876543210');
            await page.locator('#paymentMethod').selectOption('payatoutlet');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Check missing bat model
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete bat details');
            expect(alertMessage).toContain('model name and package selection');

            // Add bat model but no package type
            const row = page.locator('.bat-card').first();
            await row.locator('.batModel').fill('MRF Genius');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete bat details');
            expect(alertMessage).toContain('model name and package selection');
        });

        test('Validates all fields before submission', async ({ page }) => {
            await page.goto('/bat-knocking.html?test=true');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Store has default value, so test missing name first
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Your name');

            // Fill name, test missing phone
            await page.locator('#customerName').fill('John Doe');
            alertMessage = '';
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('WhatsApp number');

            // Fill name, test missing phone
            await page.locator('#customerName').fill('John Doe');
            alertMessage = '';
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('WhatsApp number');

            // Fill phone, test missing bat details
            await page.locator('#phone').fill('9876543210');
            alertMessage = '';
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete bat details');

            // Fill bat model, test missing package
            const row = page.locator('.bat-card').first();
            await row.locator('.batModel').fill('SS TON');
            alertMessage = '';
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete bat details');

            // Fill package, payment method already has default (online)
            await row.locator('.packageType').selectOption('10000');
            alertMessage = '';
            // Should now pass validation since payment method defaults to online
            // Test would proceed to online payment flow
        });

        test.describe('Bat Management', () => {
            test('Adds and removes bats', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Initially one bat
                let batCards = page.locator('.bat-card');
                await expect(batCards).toHaveCount(1);

                // Add bat
                await page.locator('#addBatBtn').click();
                await expect(batCards).toHaveCount(2);

                // Add another bat
                await page.locator('#addBatBtn').click();
                await expect(batCards).toHaveCount(3);

                // Remove bat
                await page.locator('#removeBatBtn').click();
                await expect(batCards).toHaveCount(2);

                // Remove another bat
                await page.locator('#removeBatBtn').click();
                await expect(batCards).toHaveCount(1);
            });

            test('Validates each bat independently', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Setup basic form
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Test User');
                await page.locator('#phone').fill('9876543210');
                await page.locator('#paymentMethod').selectOption('payatoutlet');

                // Add multiple bats
                await page.locator('#addBatBtn').click();
                await page.locator('#addBatBtn').click();

                // Fill first bat completely
                const bat1 = page.locator('.bat-card').nth(0);
                await bat1.locator('.batModel').fill('MRF Genius');
                await bat1.locator('.packageType').selectOption('10000');

                // Fill third bat completely
                const bat3 = page.locator('.bat-card').nth(2);
                await bat3.locator('.batModel').fill('SS TON');
                await bat3.locator('.packageType').selectOption('15000');

                // Leave second bat incomplete - missing model
                const bat2 = page.locator('.bat-card').nth(1);
                await bat2.locator('.packageType').selectOption('20000');

                let alertMessage = '';
                page.on('dialog', async dialog => {
                    alertMessage = dialog.message();
                    await dialog.accept();
                });

                // Should validate and find missing model in bat 2
                await page.locator('#confirmButton').click();
                expect(alertMessage).toContain('Bat #2');
                expect(alertMessage).toContain('bat model name');
            });
        });

        test.describe('Package Selection and Pricing', () => {
            test('Displays correct prices for each package', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const packages = [
                    { value: '100', expectedPrice: '₹1' },      // Test package
                    { value: '10000', expectedPrice: '₹800' },
                    { value: '15000', expectedPrice: '₹1100' },
                    { value: '20000', expectedPrice: '₹1500' },
                    { value: '25000', expectedPrice: '₹1800' },
                    { value: '30000', expectedPrice: '₹2000' }
                ];

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');

                for (const pkg of packages) {
                    await row.locator('.packageType').selectOption(pkg.value);
                    const lineTotal = row.locator('.fw-bold.text-primary');
                    await expect(lineTotal).toHaveText(pkg.expectedPrice);
                }
            });

            test('Calculates line total with quantity', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000'); // ₹800

                // Check initial total
                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹800');

                // Change quantity to 2
                await row.locator('.quantity').fill('2');
                await expect(lineTotal).toHaveText('₹1600');

                // Change quantity to 3
                await row.locator('.quantity').fill('3');
                await expect(lineTotal).toHaveText('₹2400');
            });

            test('Updates summary total correctly', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const summaryCount = page.locator('#summaryCount');
                const summaryTotal = page.locator('#summaryTotal');

                // Initial state (1 bat but no package selected yet)
                await expect(summaryCount).toHaveText('1');
                await expect(summaryTotal).toHaveText('0');

                // Add first bat details
                const bat1 = page.locator('.bat-card').first();
                await bat1.locator('.batModel').fill('Bat 1');
                await bat1.locator('.packageType').selectOption('10000'); // ₹800
                await expect(summaryCount).toHaveText('1');
                await expect(summaryTotal).toHaveText('800');                // Add second bat
                await page.locator('#addBatBtn').click();
                const bat2 = page.locator('.bat-card').nth(1);
                await bat2.locator('.batModel').fill('Bat 2');
                await bat2.locator('.packageType').selectOption('15000'); // ₹1100
                await expect(summaryCount).toHaveText('2');
                await expect(summaryTotal).toHaveText('1900'); // 800 + 1100

                // Change quantity of first bat
                await bat1.locator('.quantity').fill('2');
                await expect(summaryCount).toHaveText('3'); // 2 + 1
                await expect(summaryTotal).toHaveText('2700'); // 1600 + 1100
            });
        });

        test.describe('Threading Services', () => {
            test('Calculates threading top service correctly', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000'); // ₹800

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹800');

                // Check threading top
                const threadingTop = row.locator('.threading-top');
                await threadingTop.check();
                await expect(lineTotal).toHaveText('₹900'); // 800 + 100
            });

            test('Calculates threading bottom service correctly', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000'); // ₹800

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹800');

                // Check threading bottom
                const threadingBottom = row.locator('.threading-bottom');
                await threadingBottom.check();
                await expect(lineTotal).toHaveText('₹900'); // 800 + 100
            });

            test('Calculates threading both service correctly', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000'); // ₹800

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹800');

                // Check threading both
                const threadingBoth = row.locator('.threading-both');
                await threadingBoth.check();
                await expect(lineTotal).toHaveText('₹950'); // 800 + 150
            });

            test('Threading both unchecks individual threading options', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000');

                const threadingTop = row.locator('.threading-top');
                const threadingBottom = row.locator('.threading-bottom');
                const threadingBoth = row.locator('.threading-both');

                // Check top and bottom
                await threadingTop.check();
                await threadingBottom.check();
                await expect(threadingTop).toBeChecked();
                await expect(threadingBottom).toBeChecked();

                // Check both - should uncheck top and bottom
                await threadingBoth.check();
                await expect(threadingBoth).toBeChecked();
                await expect(threadingTop).not.toBeChecked();
                await expect(threadingBottom).not.toBeChecked();

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹950'); // 800 + 150
            });

            test('Individual threading unchecks both option', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000');

                const threadingTop = row.locator('.threading-top');
                const threadingBoth = row.locator('.threading-both');

                // Wait for checkboxes to be ready
                await threadingBoth.waitFor({ state: 'visible' });
                await threadingTop.waitFor({ state: 'visible' });

                // Check both using setChecked (more reliable than check)
                await threadingBoth.setChecked(true);
                await expect(threadingBoth).toBeChecked();

                // Wait a bit for any UI updates to settle
                await page.waitForTimeout(100);

                // Check top - should uncheck both
                await threadingTop.setChecked(true);
                await expect(threadingTop).toBeChecked();
                await expect(threadingBoth).not.toBeChecked();

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹900'); // 800 + 100
            });

            test('Threading services work with quantities', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('Test Bat');
                await row.locator('.packageType').selectOption('10000'); // ₹800
                await row.locator('.threading-both').check(); // +150

                const lineTotal = row.locator('.fw-bold.text-primary');
                await expect(lineTotal).toHaveText('₹950'); // (800 + 150) * 1

                // Change quantity to 2
                await row.locator('.quantity').fill('2');
                await expect(lineTotal).toHaveText('₹1900'); // (800 + 150) * 2
            });
        });

        test.describe('Discount Coupon Tests', () => {
            test('Validates coupon format requirements', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Fill required fields first
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Test User');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');

                const couponInput = page.locator('#discountCoupon');
                const applyButton = page.locator('#applyCoupon');
                const feedback = page.locator('#couponFeedback');

                // Test invalid formats
                const invalidCoupons = [
                    'ABC123',  // Wrong prefix
                    '123456',  // No prefix
                    'DA',      // No amount
                    'DAabc',   // Non-numeric amount
                    'DA0',     // Zero amount
                    'DA-100',  // Negative amount
                    'DA1001',  // Amount too high
                    'DA44',    // Not multiple of 50
                    'DA75',    // Not multiple of 50
                    'DA125'    // Not multiple of 50
                ];

                for (const invalid of invalidCoupons) {
                    await couponInput.fill(invalid);
                    await applyButton.click();
                    await expect(feedback).toBeVisible();
                    await expect(feedback).toHaveClass(/invalid-feedback/);
                }
            });

            test('Applies valid discount amounts', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Setup base order
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Discount Test');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000'); // Base price 800

                const couponInput = page.locator('#discountCoupon');
                const applyButton = page.locator('#applyCoupon');
                const summaryTotal = page.locator('#summaryTotal');

                // Test different discount amounts
                const testCases = [
                    { coupon: 'DA50', expectedTotal: '750' },    // 800 - 50
                    { coupon: 'DA100', expectedTotal: '700' },   // 800 - 100
                    { coupon: 'DA150', expectedTotal: '650' },   // 800 - 150
                    { coupon: 'DA200', expectedTotal: '600' }    // 800 - 200
                ];

                for (const { coupon, expectedTotal } of testCases) {
                    await couponInput.fill(coupon);
                    await applyButton.click();

                    const successMessage = page.locator('#couponSuccess');
                    await expect(successMessage).toBeVisible();
                    await expect(successMessage).toContainText(/Coupon applied/i);
                    await expect(summaryTotal).toHaveText(expectedTotal);

                    // Clear for next test
                    await couponInput.fill('');
                    await couponInput.press('Tab');
                    await expect(summaryTotal).toHaveText('800'); // Verify reset to original
                }
            });

            test('Applies discount to multiple bats', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Setup base order with two bats
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Multi Bat');
                await page.locator('#phone').fill('9876543210');

                // First bat - 10000 (800)
                const bat1 = page.locator('.bat-card').first();
                await bat1.locator('.batModel').fill('Bat 1');
                await bat1.locator('.packageType').selectOption('10000');

                // Add second bat - 15000 (1100)
                await page.locator('#addBatBtn').click();
                const bat2 = page.locator('.bat-card').nth(1);
                await bat2.locator('.batModel').fill('Bat 2');
                await bat2.locator('.packageType').selectOption('15000');

                const summaryTotal = page.locator('#summaryTotal');
                // Verify initial total (800 + 1100 = 1900)
                await expect(summaryTotal).toHaveText('1900');

                // Apply discount
                await page.locator('#discountCoupon').fill('DA200');
                await page.locator('#applyCoupon').click();

                // Verify final amount (1900 - 200 = 1700)
                await expect(summaryTotal).toHaveText('1700');
            });

            test('Combines discount with threading services', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Setup order with threading service
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Threading Test');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000'); // Base 800
                await row.locator('.threading-both').check(); // +150

                const summaryTotal = page.locator('#summaryTotal');
                await expect(summaryTotal).toHaveText('950');

                // Apply discount
                await page.locator('#discountCoupon').fill('DA100');
                await page.locator('#applyCoupon').click();

                // Verify final amount (950 - 100 = 850)
                await expect(summaryTotal).toHaveText('850');
            });

            test('Verifies discount in backend payload', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const BACKEND_BASE = await getBackendBase(page);
                let orderPayload: any = null;

                // Intercept create-order request
                await page.route(`${BACKEND_BASE}/api/create-order`, async route => {
                    const request = route.request();
                    orderPayload = JSON.parse(await request.postData() || '{}');
                    await route.fulfill({
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: true,
                            order: { order_id: 'TEST123' }
                        })
                    });
                });

                // Setup order with discount
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Payload Test');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');

                // Apply discount
                await page.locator('#discountCoupon').fill('DA100');
                await page.locator('#applyCoupon').click();

                // Submit order
                await page.locator('#paymentMethod').selectOption('payatoutlet');
                await page.locator('#confirmButton').click();

                // Wait for navigation
                await page.waitForURL(/order-accepted\.html/);

                // Verify payload
                expect(orderPayload.payment).toBeDefined();
                expect(orderPayload.payment.originalAmount).toBe(800);
                expect(orderPayload.payment.discount).toEqual({
                    couponCode: 'DA100',
                    couponDiscount: 100
                });
                expect(orderPayload.payment.finalAmount).toBe(700);
            });
        });

        test.describe('Payment Flow', () => {
            test('Payment dropdown order and labels', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');
                const select = page.locator('#paymentMethod');

                const optionValues = await select.locator('option').allTextContents();
                expect(optionValues.length).toBeGreaterThanOrEqual(3);
                expect(optionValues[1].trim()).toBe('Online Payment');
                expect(optionValues[2].trim()).toBe('Cash');

                const optionAttrs = await select.locator('option').all();
                const firstVal = await optionAttrs[1].getAttribute('value');
                const secondVal = await optionAttrs[2].getAttribute('value');
                expect((firstVal || '').toLowerCase()).toBe('online');
                expect((secondVal || '').toLowerCase()).toBe('payatoutlet');
            });

            test('Online Payment is selected by default', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');
                const select = page.locator('#paymentMethod');

                // Check that online is the default selected value
                const selectedValue = await select.inputValue();
                expect(selectedValue).toBe('online');

                // Check that the online option has the selected attribute
                const onlineOption = select.locator('option[value="online"]');
                await expect(onlineOption).toHaveAttribute('selected', '');
            });

            test('Pay at outlet flow creates order and redirects', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const BACKEND_BASE = await getBackendBase(page);
                let sawCreate = false;

                await page.route(`${BACKEND_BASE}/**`, async (route) => {
                    const req = route.request();
                    const method = req.method();
                    const corsHeaders = {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': '*',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    };
                    if (method === 'OPTIONS') {
                        await route.fulfill({ status: 204, headers: corsHeaders });
                        return;
                    }
                    if (new URL(req.url()).pathname.includes('/api/create-order')) {
                        sawCreate = true;
                        await route.fulfill({
                            status: 200,
                            headers: { 'Content-Type': 'application/json', ...corsHeaders },
                            body: JSON.stringify({
                                success: true,
                                order: { order_id: 'OID123', amount: 800 }
                            })
                        });
                        return;
                    }
                    await route.fulfill({ status: 200, headers: corsHeaders, body: '{}' });
                });

                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Pay at outlet Flow');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');
                await page.locator('#paymentMethod').selectOption('payatoutlet');

                const confirm = page.locator('#confirmButton');
                await expect(confirm).toBeEnabled();
                const navPromise = page.waitForURL(/\/order-accepted\.html\?/);
                await confirm.click();
                await navPromise;

                expect(sawCreate).toBeTruthy();
                const url = page.url();
                expect(url).toContain('oid=OID123');
                expect(url).toContain('amount=800');
            });

            test('Online flow stubs widget and verifies payment', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Stub ZPayments widget
                await page.evaluate(() => {
                    // @ts-ignore
                    window.ZPayments = class {
                        constructor() { }
                        async requestPaymentMethod() { return { payment_id: 'PAY123' }; }
                        async close() { }
                    };
                });

                const BACKEND_BASE = await getBackendBase(page);
                let sawCreate = false;
                let sawVerify = false;

                await page.route(`${BACKEND_BASE}/**`, async (route) => {
                    const req = route.request();
                    const method = req.method();
                    const path = new URL(req.url()).pathname;
                    const corsHeaders = {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': '*',
                        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
                    };

                    if (method === 'OPTIONS') {
                        await route.fulfill({ status: 204, headers: corsHeaders });
                        return;
                    }

                    if (path.includes('/api/create-order')) {
                        sawCreate = true;
                        await route.fulfill({
                            status: 200,
                            headers: { 'Content-Type': 'application/json', ...corsHeaders },
                            body: JSON.stringify({
                                success: true,
                                data: {
                                    payments_session_id: 'SESSION_X',
                                    amount: 800,
                                    zpayConfig: {
                                        account_id: '60044148024',
                                        domain: 'IN',
                                        api_key: 'dummy'
                                    },
                                    order_id: 'OID456'
                                }
                            })
                        });
                        return;
                    }

                    if (path.includes('/api/verify-payment')) {
                        sawVerify = true;
                        await route.fulfill({
                            status: 200,
                            headers: { 'Content-Type': 'application/json', ...corsHeaders },
                            body: JSON.stringify({ success: true })
                        });
                        return;
                    }

                    await route.fulfill({ status: 200, headers: corsHeaders, body: '{}' });
                });

                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Online Flow');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');
                await page.locator('#paymentMethod').selectOption('online');

                const confirm = page.locator('#confirmButton');
                await expect(confirm).toBeEnabled();

                const verifyReqPromise = page.waitForRequest(
                    (req) => req.url().includes('/api/verify-payment'),
                    { timeout: 10000 }
                ).catch(() => null);

                await confirm.click();

                const verifyReq = await verifyReqPromise;
                expect(sawCreate).toBeTruthy();
                expect(!!verifyReq || sawVerify).toBeTruthy();
            });

            test('Handles case-insensitive payment method values', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                // Setup basic form data
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Case Test User');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');

                // Mock backend response
                await page.route('**/api/create-order', route => route.fulfill({
                    status: 200,
                    body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
                }));

                // Test different case variations
                const paymentMethodTests = ['payatoutlet', 'PAYATOUTLET', 'PayAtOutlet'];

                for (const value of paymentMethodTests) {
                    await page.evaluate((val) => {
                        const option = document.createElement('option');
                        option.value = val;
                        option.text = 'Pay at outlet';
                        const select = document.getElementById('paymentMethod');
                        if (select) {
                            select.innerHTML = '';
                            select.appendChild(option);
                        }
                    }, value);

                    await page.locator('#paymentMethod').selectOption(value);
                    const navPromise = page.waitForURL(/\/order-accepted\.html\?/);
                    await page.locator('#confirmButton').click();
                    await navPromise;

                    await expect(page).toHaveURL(/order-accepted\.html/);

                    // Go back for next iteration
                    await page.goto('/bat-knocking.html?test=true');
                    await page.locator('#storeLocation').selectOption({ index: 1 });
                    await page.locator('#customerName').fill('Case Test User');
                    await page.locator('#phone').fill('9876543210');
                    const testRow = page.locator('.bat-card').first();
                    await testRow.locator('.batModel').fill('MRF Genius');
                    await testRow.locator('.packageType').selectOption('10000');
                }
            });
        });

        test.describe('Backend Payload Validation', () => {
            test('Sends correct bat details in payload', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const BACKEND_BASE = await getBackendBase(page);
                let orderPayload: any = null;

                await page.route(`${BACKEND_BASE}/api/create-order`, async route => {
                    const request = route.request();
                    orderPayload = JSON.parse(await request.postData() || '{}');
                    await route.fulfill({
                        status: 200,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                        body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
                    });
                });

                await page.locator('#storeLocation').selectOption('Gaur City 1');
                await page.locator('#customerName').fill('John Doe');
                await page.locator('#phone').fill('9876543210');

                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius Grand Edition');
                await row.locator('.packageType').selectOption('10000');
                await row.locator('.quantity').fill('2');
                await row.locator('.threading-both').check();

                await page.locator('#paymentMethod').selectOption('payatoutlet');
                await page.locator('#confirmButton').click();
                await page.waitForURL(/order-accepted\.html/);

                expect(orderPayload).toBeDefined();
                expect(orderPayload.customerName).toBe('John Doe');
                expect(orderPayload.phone).toBe('9876543210');
                expect(orderPayload.store).toBe('Gaur City 1');
                expect(orderPayload.serviceType).toBe('bat-knocking');
                expect(orderPayload.batDetails).toHaveLength(1);
                expect(orderPayload.batDetails[0]).toMatchObject({
                    batModel: 'MRF Genius Grand Edition',
                    package: '10000',
                    threading: 'both',
                    qty: 2,
                    cost: 950 // 800 + 150
                });
            });

            test('Includes pickup/drop in payload when checked', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const BACKEND_BASE = await getBackendBase(page);
                let orderPayload: any = null;

                await page.route(`${BACKEND_BASE}/api/create-order`, async route => {
                    orderPayload = JSON.parse(await route.request().postData() || '{}');
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
                    });
                });

                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Test User');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('10000');

                // Check pickup/drop
                await page.locator('#pickupDrop').check();

                await page.locator('#paymentMethod').selectOption('payatoutlet');
                await page.locator('#confirmButton').click();
                await page.waitForURL(/order-accepted\.html/);

                expect(orderPayload.pickupDrop).toBe(true);
            });

            test('Sends test mode flag when enabled', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const BACKEND_BASE = await getBackendBase(page);
                let orderPayload: any = null;

                await page.route(`${BACKEND_BASE}/api/create-order`, async route => {
                    orderPayload = JSON.parse(await route.request().postData() || '{}');
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
                    });
                });

                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Test User');
                await page.locator('#phone').fill('9876543210');
                const row = page.locator('.bat-card').first();
                await row.locator('.batModel').fill('MRF Genius');
                await row.locator('.packageType').selectOption('100'); // Test package
                await page.locator('#paymentMethod').selectOption('payatoutlet');
                await page.locator('#confirmButton').click();
                await page.waitForURL(/order-accepted\.html/);

                expect(orderPayload.testMode).toBe(true);
            });
        });

        test.describe('UI Elements', () => {
            test('Test mode indicator displays when enabled', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');
                const indicator = page.locator('#testModeIndicator');
                await expect(indicator).toBeVisible();
                await expect(indicator).toHaveText('TEST MODE ENABLED');
            });

            test('Test mode indicator hidden in normal mode', async ({ page }) => {
                await page.goto('/bat-knocking.html');
                const indicator = page.locator('#testModeIndicator');
                await expect(indicator).not.toBeVisible();
            });

            test('Service notes section is visible', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');
                const notes = page.locator('#service-notes');
                await expect(notes).toBeVisible();
                await expect(notes).toContainText('Important Service Notes');
                await expect(notes).toContainText('Professional machine knocking');
                await expect(notes).toContainText('25 minutes to 3 hours');
            });

            test('Pricing table is collapsible', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const pricingTable = page.locator('#pricingTable');
                await expect(pricingTable).not.toBeVisible();

                // Click to expand
                await page.getByText('View Knocking Packages & Pricing').click();
                await expect(pricingTable).toBeVisible();

                // Verify pricing table content
                await expect(pricingTable).toContainText('10,000 balls');
                await expect(pricingTable).toContainText('₹800');
                await expect(pricingTable).toContainText('30,000 balls');
                await expect(pricingTable).toContainText('₹2,000');
            });

            test('Summary displays real-time WhatsApp update info', async ({ page }) => {
                await page.goto('/bat-knocking.html?test=true');

                const summary = page.locator('.card.p-3.mb-3');
                await expect(summary).toContainText('Real-Time WhatsApp Updates');
                await expect(summary).toContainText('Order is confirmed');
                await expect(summary).toContainText('Service is completed');
                await expect(summary).toContainText('Ready for pickup');
            });
        });
    });
});
