import { test, expect, Page, Route, Dialog } from '@playwright/test';

// Helper to extract BACKEND_BASE from inline script in stringing-booking.html
async function getBackendBase(page: Page): Promise<string> {
    const html = await page.content();
    const match = html.match(/const\s+BACKEND_BASE\s*=\s*['\"]([^'\"]+)['\"]/);
    if (!match) throw new Error('Could not find BACKEND_BASE in HTML');
    return match[1];
}

test.describe('Stringing Booking UI', () => {
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
        expect(optionValues[2].trim()).toBe('Pay At Outlet');
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

        // Verify alert shows missing fields
        expect(alertMessage).toContain('Store location');
        expect(alertMessage).toContain('Your name');
        expect(alertMessage).toContain('WhatsApp number');
        expect(alertMessage).toContain('Payment method');

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

            // Verify alert contains all required fields
            expect(alertMessage).toContain('Store location');
            expect(alertMessage).toContain('Your name');
            expect(alertMessage).toContain('WhatsApp number');
            expect(alertMessage).toContain('Payment method');
        });

        test('Validates phone number format', async ({ page }) => {
            await page.goto('/stringing-booking.html?test=true');

            // Fill everything except phone
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
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
            expect(alertMessage).toContain('Valid 10-digit WhatsApp number');

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
            expect(alertMessage).toContain('enter a racket name for racket #1');

            // Add racket name but no string type
            const row = page.locator('.racket-row').first();
            await row.locator('.racketCustomName').fill('Test Racket');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('select a string type for racket #1');

            // Add string type but invalid tension
            await row.locator('.racketName').selectOption('Yonex BG 65');
            await row.locator('.stringTension').fill('5');
            await page.locator('#confirmButton').click();
            expect(alertMessage).toContain('valid tension (10-35 lbs)');

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
