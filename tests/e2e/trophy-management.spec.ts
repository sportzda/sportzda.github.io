import { test, expect } from '@playwright/test';

test.describe('Trophy Management & Shop', () => {
    test('Shop page filters trophies by multiple categories and displays correctly', async ({ page }) => {
        await page.goto('/trophies-shop.html');

        // 1. Verify "Type" filter is REMOVED
        const typeFilter = page.locator('text=Type');
        await expect(typeFilter).toHaveCount(0);

        // 2. Verify "Sport" filters exist
        const cricketFilter = page.locator('.filter-chip[data-sport="cricket"]');
        await expect(cricketFilter).toBeVisible();

        // 3. Verify UI Refinements (Stock Text Removal)
        // We expect "available" or "SOLD OUT" but not "In Stock ("
        const productCard = page.locator('.product-card').first();
        if (await productCard.isVisible()) {
            const text = await productCard.textContent();
            expect(text).not.toContain('In Stock (');
        }
    });

    test('Clicking product image opens details modal', async ({ page }) => {
        await page.goto('/trophies-shop.html');

        // Capture console errors to debug
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
        });
        page.on('pageerror', err => console.log(`PAGE EXCEPTION: ${err.message}`));

        // Wait for products to load
        await page.waitForSelector('.product-card');

        // Find a product that is NOT sold out (sold out items might block click)
        const product = page.locator('.product-card:not(.sold-out) .product-image').first();
        if (await product.count() > 0) {
            await product.click();

            // Verify modal opens
            const modal = page.locator('#imageModal');
            await expect(modal).toHaveClass(/show/);
            await expect(modal).toBeVisible();
        } else {
            console.log('No available products found to test modal click');
        }
    });
});
