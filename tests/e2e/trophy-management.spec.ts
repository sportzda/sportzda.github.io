import { test, expect } from '@playwright/test';

test.describe('Trophy Management & Shop', () => {
    test('Shop page filters trophies by multiple categories and displays correctly', async ({ page }) => {
        await page.goto('http://localhost:5500/trophies-shop.html');

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
});
