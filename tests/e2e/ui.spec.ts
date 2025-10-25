import { test, expect } from '@playwright/test';

// Helper to extract BACKEND_BASE from inline script in stringing-booking.html
async function getBackendBase(page: any): Promise<string> {
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

    test('Confirm disabled until form valid', async ({ page }) => {
        await page.goto('/stringing-booking.html?test=true');

        const confirm = page.locator('#confirmButton');
        await expect(confirm).toBeDisabled();

        await page.locator('#storeLocation').selectOption({ index: 1 });
        await page.locator('#customerName').fill('Test User');
        await page.locator('#phone').fill('9876543210');
        await expect(confirm).toBeDisabled();

        const firstRow = page.locator('.racket-row').first();
        await expect(firstRow).toBeVisible();
        await firstRow.locator('.racketCustomName').fill('Yonex Astrox 99');
        const stringSelect = firstRow.locator('.racketName');
        const options = await stringSelect.locator('option').all();
        for (let i = 0; i < options.length; i++) {
            const val = await options[i].getAttribute('value');
            if (val && val.trim()) { await stringSelect.selectOption(val); break; }
        }
        await expect(confirm).toBeDisabled();

        await page.locator('#paymentMethod').selectOption('Cash');
        await expect(confirm).toBeEnabled();
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

    test('Backend create-order called and redirects for Cash (CORS handled)', async ({ page }) => {
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
        await page.locator('#customerName').fill('Cash Flow');
        await page.locator('#phone').fill('9876543210');
        const row = page.locator('.racket-row').first();
        await row.locator('.racketCustomName').fill('Test Racket');
        await row.locator('.racketName').selectOption('Yonex BG 65');
        await page.locator('#paymentMethod').selectOption('Cash');

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
        await page.addInitScript(() => {
            // @ts-ignore
            window.ZPayments = class {
                constructor() { }
                async requestPaymentMethod() { return { payment_id: 'PAY123' }; }
                async close() { }
            };
        });

        await page.goto('/stringing-booking.html?test=true');

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
        await page.locator('#paymentMethod').selectOption('Online');

        const confirm = page.locator('#confirmButton');
        await expect(confirm).toBeEnabled();
        await confirm.click();
        // Give time for the flow to call verify and attempt redirect
        await page.waitForTimeout(1000);

        expect(sawCreate).toBeTruthy();
        expect(sawVerify).toBeTruthy();
    });
});
