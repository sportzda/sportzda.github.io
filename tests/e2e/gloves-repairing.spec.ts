import { test, expect, Page } from '@playwright/test';

// Helper to extract BACKEND_BASE from inline script in gloves-repairing.html
async function getBackendBase(page: Page): Promise<string> {
    const html = await page.content();

    // Try config pattern: const BACKEND_BASE = window.CONFIG?.BACKEND_BASE || 'fallback-url'
    const configMatch = html.match(/const\s+BACKEND_BASE\s*=\s*window\.CONFIG\?\.[A-Z_]+\s*\|\|\s*['\"]([^'\"]+)['\"]/);
    if (configMatch) return configMatch[1];

    // Fallback to old pattern for backwards compatibility
    const oldMatch = html.match(/const\s+BACKEND_BASE\s*=\s*['\"]([^'\"]+)['\"]/);
    if (oldMatch) return oldMatch[1];

    throw new Error('Could not find BACKEND_BASE in HTML');
}

test.describe('Gloves Repairing UI Tests', () => {
    test.describe('Form Validation', () => {
        test('Shows validation alerts for incomplete form with amount > 0', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Set amount > 0
            await page.locator('#estimate').fill('100');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Click Pay Now without filling anything
            await page.locator('#confirmButton').click();

            // Verify alert shows missing fields including payment method
            expect(alertMessage).toContain('Your name');
            expect(alertMessage).toContain('WhatsApp number');
            expect(alertMessage).toContain('Make of gloves');
            expect(alertMessage).toContain('Gloves model');
            expect(alertMessage).toContain('Nature of repair');
            expect(alertMessage).toContain('Payment method');
        });

        test('Shows validation alerts for incomplete form with zero amount', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Set amount = 0 (default)
            await page.locator('#estimate').fill('0');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            // Click Submit Order without filling anything
            await page.locator('#confirmButton').click();

            // Verify alert shows missing fields but NOT payment method
            expect(alertMessage).toContain('Your name');
            expect(alertMessage).toContain('WhatsApp number');
            expect(alertMessage).toContain('Make of gloves');
            expect(alertMessage).toContain('Gloves model');
            expect(alertMessage).toContain('Nature of repair');
            expect(alertMessage).not.toContain('Payment method');
        });

        test('Validates phone number format', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Fill form with invalid phone
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('123');
            await page.locator('#glovesMake').selectOption('SS');
            await page.locator('#glovesModel').fill('Elite');
            await page.locator('#natureOfRepair').fill('Tear in palm');
            await page.locator('#paymentMethod').selectOption('payatoutlet');

            let alertMessage = '';
            page.on('dialog', async dialog => {
                alertMessage = dialog.message();
                await dialog.accept();
            });

            await page.locator('#confirmButton').click();

            expect(alertMessage).toContain('Invalid phone number format');
        });

        test('Shows other make input when "Other" is selected', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Select "Other" make
            await page.locator('#glovesMake').selectOption('other');

            // Verify other make input is shown
            await expect(page.locator('#otherMakeContainer')).toBeVisible();
            await expect(page.locator('#otherMake')).toBeVisible();
        });

        test('Hides other make input when specific make is selected', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // First select "Other"
            await page.locator('#glovesMake').selectOption('other');
            await expect(page.locator('#otherMakeContainer')).toBeVisible();

            // Then select a specific make
            await page.locator('#glovesMake').selectOption('SS');

            // Verify other make input is hidden
            await expect(page.locator('#otherMakeContainer')).not.toBeVisible();
        });
    });

    test.describe('Form Submission', () => {
        test('Creates order and navigates to payment success for cash payment', async ({ page }) => {
            // Mock backend response
            await page.route('**/api/create-order', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        order: {
                            order_id: 'TEST123',
                            amount: 500
                        }
                    })
                });
            });

            await page.goto('/gloves-repairing.html?test=true');

            // Fill form
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('9876543210');
            await page.locator('#glovesMake').selectOption('SS');
            await page.locator('#glovesModel').fill('Elite');
            await page.locator('#natureOfRepair').fill('Tear in palm');
            await page.locator('#estimate').fill('500');
            await page.locator('#paymentMethod').selectOption('payatoutlet');

            // Submit form
            await page.locator('#confirmButton').click();

            // Verify navigation to order accepted page
            await expect(page).toHaveURL(/order-accepted\.html/);
            expect(page.url()).toContain('oid=TEST123');
            expect(page.url()).toContain('amount=500');
            expect(page.url()).toContain('name=Test%20User');
        });

        test('Creates order and navigates to order accepted for zero amount', async ({ page }) => {
            // Mock backend response
            await page.route('**/api/create-order', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        order: {
                            order_id: 'TEST124',
                            amount: 0
                        }
                    })
                });
            });

            await page.goto('/gloves-repairing.html?test=true');

            // Fill form with zero amount
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('9876543210');
            await page.locator('#glovesMake').selectOption('SS');
            await page.locator('#glovesModel').fill('Elite');
            await page.locator('#natureOfRepair').fill('Minor repair');
            await page.locator('#estimate').fill('0');
            // Note: No payment method needed for zero amount

            // Submit form
            await page.locator('#confirmButton').click();

            // Verify navigation to order accepted page
            await expect(page).toHaveURL(/order-accepted\.html/);
            expect(page.url()).toContain('oid=TEST124');
            expect(page.url()).toContain('amount=0');
            expect(page.url()).toContain('name=Test%20User');
            expect(page.url()).toContain('service=gloves-repairing');
        });

        test('Creates order with other make specified', async ({ page }) => {
            let requestBody: any = null;

            // Mock backend to capture request
            await page.route('**/api/create-order', async (route) => {
                requestBody = JSON.parse(route.request().postData() || '{}');
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        order: {
                            order_id: 'TEST124',
                            amount: 300
                        }
                    })
                });
            });

            await page.goto('/gloves-repairing.html?test=true');

            // Fill form with "Other" make
            await page.locator('#storeLocation').selectOption({ index: 1 });
            await page.locator('#customerName').fill('Test User');
            await page.locator('#phone').fill('9876543210');
            await page.locator('#glovesMake').selectOption('other');
            await page.locator('#otherMake').fill('Custom Brand');
            await page.locator('#glovesModel').fill('Pro');
            await page.locator('#natureOfRepair').fill('Broken finger');
            await page.locator('#estimate').fill('300');
            await page.locator('#paymentMethod').selectOption('payatoutlet');

            // Submit form
            await page.locator('#confirmButton').click();

            // Verify request contains correct make
            expect(requestBody).not.toBeNull();
            expect(requestBody.glovesDetails.make).toBe('Custom Brand');
            expect(requestBody.serviceType).toBe('gloves-repairing');
        });
    });

    test.describe('Image Upload', () => {
        test('Shows image preview when file is selected', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Mock file selection
            const fileInput = page.locator('#imageUpload');
            await fileInput.setInputFiles({
                name: 'test-image.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake-image-data')
            });

            // Verify preview is shown (though we can't test the actual image display without a real file)
            await expect(page.locator('#imagePreview')).toBeVisible();
        });
    });

    test.describe('Estimate Display', () => {
        test('Updates summary estimate when estimate is entered', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Enter estimate
            await page.locator('#estimate').fill('750');

            // Verify summary shows the estimate
            await expect(page.locator('#summaryEstimate')).toHaveText('750');
        });

        test('Changes button text based on amount', async ({ page }) => {
            await page.goto('/gloves-repairing.html?test=true');

            // Default should be "Submit Order" for zero amount
            await expect(page.locator('#confirmButton')).toHaveText('Submit Order');

            // Enter positive amount
            await page.locator('#estimate').fill('100');

            // Button should change to "Pay Now"
            await expect(page.locator('#confirmButton')).toHaveText('Pay Now');

            // Enter zero amount again
            await page.locator('#estimate').fill('0');

            // Button should change back to "Submit Order"
            await expect(page.locator('#confirmButton')).toHaveText('Submit Order');
        });
    });
});