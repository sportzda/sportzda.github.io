import { test, expect, Page, Route, Dialog } from '@playwright/test';

// Helper to extract BACKEND_BASE from inline script in stringing-booking.html
async function getBackendBase(page: Page): Promise<string> {
    const html = await page.content();
    const match = html.match(/const\s+BACKEND_BASE\s*=\s*['\"]([^'\"]+)['\"]/);
    if (!match) throw new Error('Could not find BACKEND_BASE in HTML');
    return match[1];
}

test.describe('Stringing Booking UI', () => {
    test.describe('Discount Coupon Tests', () => {
        test('validates coupon format requirements', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Fill required fields first
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('9876543210');
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('24');

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
                await expect(feedback).toContainText(/Invalid coupon/);
            }
        });

        test('applies valid discount amounts', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Setup base order
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Discount Test');
            await page.locator('#phone').fill('9876543210');
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65'); // Base price 550
            await row.locator('.stringTension').fill('24');

            const couponInput = page.locator('#discountCoupon');
            const applyButton = page.locator('#applyCoupon');
            const summaryTotal = page.locator('#summaryTotal');

            // Test different discount amounts (only multiples of 50)
            const testCases = [
                { coupon: 'DA50', expectedTotal: '500' },    // 550 - 50
                { coupon: 'DA100', expectedTotal: '450' },   // 550 - 100
                { coupon: 'DA150', expectedTotal: '400' },   // 550 - 150
                { coupon: 'DA200', expectedTotal: '350' }    // 550 - 200
            ];

            for (const { coupon, expectedTotal } of testCases) {
                await couponInput.fill(coupon);
                await applyButton.click();

                const successMessage = page.locator('#couponSuccess');
                await expect(successMessage).toHaveClass(/valid-feedback/);
                await expect(successMessage).toContainText(/Coupon applied/i);
                await expect(summaryTotal).toHaveText(expectedTotal);

                // Clear for next test
                await couponInput.fill('');
                await couponInput.press('Tab');
                await expect(summaryTotal).toHaveText('550'); // Verify reset to original
            }
        });

        test('combines discount with express service fee', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Setup order with express service
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Express Test');
            await page.locator('#phone').fill('9876543210');
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65'); // Base 550
            await row.locator('.stringTension').fill('24');

            // Enable express service (+20)
            await page.locator('#expressService').check();
            await expect(page.locator('#summaryTotal')).toHaveText('570');

            // Apply discount
            await page.locator('#discountCoupon').fill('DA100');
            await page.locator('#applyCoupon').click();

            // Verify final amount (570 - 100 = 470)
            await expect(page.locator('#summaryTotal')).toHaveText('470');
        });

        test('applies discount to multiple rackets', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Setup base order with two rackets
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Multi Racket');
            await page.locator('#phone').fill('9876543210');

            // First racket - BG 65 (550)
            const row1 = page.locator('.racket-row').first();
            await row1.locator('.racketCustomName').fill('Racket 1');
            await row1.locator('.racketName').selectOption('Yonex BG 65');
            await row1.locator('.stringTension').fill('24');

            // Add second racket - BG 80 (700)
            await page.locator('#addRacketBtn').click();
            const row2 = page.locator('.racket-row').nth(1);
            await row2.locator('.racketCustomName').fill('Racket 2');
            await row2.locator('.racketName').selectOption('Yonex BG 80');
            await row2.locator('.stringTension').fill('25');

            // Verify initial total (550 + 700 = 1250)
            await expect(page.locator('#summaryTotal')).toHaveText('1250');

            // Apply discount
            await page.locator('#discountCoupon').fill('DA200');
            await page.locator('#applyCoupon').click();

            // Verify final amount (1250 - 200 = 1050)
            await expect(page.locator('#summaryTotal')).toHaveText('1050');
        });

        test('verifies discount in backend payload', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

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
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('24');

            // Apply discount
            await page.locator('#discountCoupon').fill('DA100');
            await page.locator('#applyCoupon').click();

            // Submit order
            await page.locator('#paymentMethod').selectOption('payatoutlet');
            await page.locator('#confirmButton').click();

            // Verify payload
            expect(orderPayload.payment).toBeDefined();
            expect(orderPayload.payment.originalAmount).toBe(550);
            expect(orderPayload.payment.discount).toEqual({
                couponCode: 'DA100',
                couponDiscount: 100
            });
            expect(orderPayload.payment.finalAmount).toBe(450);
        });
    });

    test('Express toggle updates summary text', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');

        const summary = page.locator('#summaryService');
        await expect(summary).toBeVisible();
        await expect(summary).toContainText(/Normal/i);

        const express = page.locator('#expressService');
        await expect(express).toBeVisible();
        await express.check();

        await expect(summary).toContainText(/Express/i);
    });

    test('Payment dropdown order and labels', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');
        const select = page.locator('#paymentMethod');
        // First real option after placeholder should be Online Payment
        const optionValues = await select.locator('option').allTextContents();
        // optionValues[0] is placeholder "-- Select Payment Method --" so check next two
        expect(optionValues.length).toBeGreaterThanOrEqual(3);
        expect(optionValues[1].trim()).toBe('Online Payment');
        expect(optionValues[2].trim()).toBe('Cash');
        // Also ensure underlying values (lowercase) exist
        const optionAttrs = await select.locator('option').all();
        const firstVal = await optionAttrs[1].getAttribute('value');
        const secondVal = await optionAttrs[2].getAttribute('value');
        expect((firstVal || '').toLowerCase()).toBe('online');
        expect((secondVal || '').toLowerCase()).toBe('payatoutlet');
    });

    test('Shows validation alerts for incomplete form', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');

        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.accept();
        });

        // Click Pay Now without filling anything
        await page.locator('#confirmButton').click();

        // Verify alert shows missing fields (store and payment method have default values)
        expect(alertMessage).toContain('Your name');
        expect(alertMessage).toContain('WhatsApp number');
        // Payment method now has default value (online), so it won't be in missing fields

        const firstRow = page.locator('.racket-row').first();
        await expect(firstRow).toBeVisible();
        await firstRow.locator('.racketCustomName').fill('Yonex Astrox 99');
        const stringSelect = firstRow.locator('.racketName');
        const options = await stringSelect.locator('option').all();
        for (let i = 0; i < options.length; i++) {
            const val = await options[i].getAttribute('value');
            if (val && val.trim()) { await stringSelect.selectOption(val); break; }
        }
        await page.locator('#paymentMethod').selectOption('payatoutlet');
    });

    test('Price calculation and Express fee applied', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');

        await page.locator('#storeLocation').selectOption({ index: 1 });
        await page.locator('#customerName').fill('Price Test');
        await page.locator('#phone').fill('9876543210');

        const row = page.locator('.racket-row').first();
        await row.locator('.racketCustomName').fill('Test Racket');
        await row.locator('.racketName').selectOption('Yonex BG 65');

        const summaryTotal = page.locator('#summaryTotal');
        await expect(summaryTotal).toHaveText(/550/);

        const express = page.locator('#expressService');
        await express.check();
        await expect(summaryTotal).toHaveText(/570/);

        const qty = row.locator('.quantity');
        await qty.fill('2');
        await expect(summaryTotal).toHaveText(/1140/);
    });

    test('Backend create-order called and redirects for Pay at outlet (CORS handled)', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');

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
                    body: JSON.stringify({ success: true, order: { order_id: 'OID123', amount: 900 } })
                });
                return;
            }
            await route.fulfill({ status: 200, headers: corsHeaders, body: '{}' });
        });

        await page.locator('#storeLocation').selectOption({ index: 1 });
        await page.locator('#customerName').fill('Pay at outlet Flow');
        await page.locator('#phone').fill('9876543210');
        const row = page.locator('.racket-row').first();
        await row.locator('.racketCustomName').fill('Test Racket');
        await row.locator('.racketName').selectOption('Yonex BG 65');
        await page.locator('#paymentMethod').selectOption('payatoutlet');

        const confirm = page.locator('#confirmButton');
        await expect(confirm).toBeEnabled();
        const navPromise = page.waitForURL(/\/order-accepted\.html\?/);
        await confirm.click();
        await navPromise;

        expect(sawCreate).toBeTruthy();
        const url = page.url();
        expect(url).toContain('oid=OID123');
        expect(url).toContain('amount=900');
    });

    test('Online flow stubs widget and verifies payment (CORS handled)', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');
        // Ensure our stub overrides any external script definition
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
                    body: JSON.stringify({ success: true, data: { payments_session_id: 'SESSION_X', amount: 1234, zpayConfig: { account_id: '60044148024', domain: 'IN', api_key: 'dummy' }, order_id: 'OID456' } })
                });
                return;
            }
            if (path.includes('/api/verify-payment')) {
                sawVerify = true;
                await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }, body: JSON.stringify({ success: true }) });
                return;
            }
            await route.fulfill({ status: 200, headers: corsHeaders, body: '{}' });
        });

        await page.locator('#storeLocation').selectOption({ index: 1 });
        await page.locator('#customerName').fill('Online Flow');
        await page.locator('#phone').fill('9876543210');
        const row = page.locator('.racket-row').first();
        await row.locator('.racketCustomName').fill('Test Racket');
        await row.locator('.racketName').selectOption('Yonex BG 65');
        await page.locator('#paymentMethod').selectOption('online');

        const confirm = page.locator('#confirmButton');
        await expect(confirm).toBeEnabled();
        // Proactively wait for the verify-payment request to be issued by the app
        const verifyReqPromise = page.waitForRequest((req) => req.url().includes('/api/verify-payment'), { timeout: 10000 }).catch(() => null);
        await confirm.click();

        // Ensure create and verify were called
        const verifyReq = await verifyReqPromise;
        expect(sawCreate).toBeTruthy();
        expect(!!verifyReq || sawVerify).toBeTruthy();
    });

    test.describe('Form Validation', () => {
        test('Shows alert for missing fields', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Setup dialog handler to capture alert messages
            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Click Pay Now without filling anything
            const confirm = page.locator('#confirmButton');
            await confirm.click();

            // Verify alert contains all required fields (store and payment method have default values)
            expect(alertMessage).toContain('Your name');
            expect(alertMessage).toContain('WhatsApp number');
            // Payment method now has default value (online), so it won't be in missing fields
        });

        test('Validates phone number format', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Fill everything except phone (payment method already defaults to online)
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            // Using cash to simplify test flow (avoid online payment widget)
            await page.locator('#paymentMethod').selectOption('payatoutlet');
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('24');

            // Setup dialog handler
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
            // Now the form should proceed to payment
            await page.route('**/api/create-order', route => route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
            }));
            await page.locator('#confirmButton').click();
            // Should navigate to order accepted page
            await expect(page).toHaveURL(/order-accepted\.html/);
        });

        test('Validates racket details', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

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

            // Check missing racket name
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete racket details');
            expect(alertMessage).toContain('name, string type, and tension');

            // Add racket name but no string type
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Complete racket details');

            // Add string type but invalid tension
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('5');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('Racket #1');
            expect(alertMessage).toContain('valid string tension');
            expect(alertMessage).toContain('10-35 lbs');

            // Fix tension - this should allow the form to proceed to payment
            await row.locator('.stringTension').fill('24');
            // Setup mock response for order creation
            await page.route('**/api/create-order', route => route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
            }));
            await page.locator('#confirmButton').click();
            // Should navigate to order accepted page
            await expect(page).toHaveURL(/order-accepted\.html/);
        });

        test('Handles case-insensitive payment method values', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Setup basic form data
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Case Test User');
            await page.locator('#phone').fill('9876543210');
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('24');

            // Test different case variations for pay at outlet
            const paymentMethodTests = [
                'payatoutlet',
                'PAYATOUTLET',
                'PayAtOutlet',
                'payAtOutlet'
            ];

            // Mock backend response
            await page.route('**/api/create-order', route => route.fulfill({
                status: 200,
                body: JSON.stringify({ success: true, order: { order_id: 'TEST123' } })
            }));

            // Try each case variation
            for (const value of paymentMethodTests) {
                // Modify the value attribute directly using JavaScript
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

                // Verify navigation to order accepted page
                await expect(page).toHaveURL(/order-accepted\.html/);

                // Go back to test form for next iteration
                await page.goto('/stringing-booking.html?test=true');

                // Re-fill the form
                await page.locator('#storeLocation').selectOption({ index: 1 });
                await page.locator('#customerName').fill('Case Test User');
                await page.locator('#phone').fill('9876543210');
                const testRow = page.locator('.racket-row').first();
                await testRow.locator('.racketCustomName').fill('Test Racket');
                await testRow.locator('.racketName').selectOption('Yonex BG 65');
                await testRow.locator('.stringTension').fill('24');
            }
        });
    });
});
