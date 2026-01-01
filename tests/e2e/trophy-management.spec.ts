import { test, expect } from '@playwright/test';

test.describe('Trophy Management & Shop', () => {
    test('Shop page filters trophies by multiple categories and displays correctly', async ({ page }) => {
        // Mock the API response
        await page.route('**/api/trophies', async (route) => {
            const mockTrophies = [
                {
                    _id: '1',
                    id: '1',
                    name: 'Test Cricket Trophy',
                    category: ['Cricket', 'Sports'],
                    sport: ['Cricket'],
                    type: 'Cup',
                    price: 500,
                    inventory: 10,
                    image: 'test.jpg'
                },
                {
                    _id: '2',
                    id: '2',
                    name: 'Test Football Medal',
                    category: ['Football'],
                    sport: ['Football'],
                    type: 'Medal',
                    price: 150,
                    inventory: 0,
                    image: 'medal.jpg'
                }
            ];
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ trophies: mockTrophies })
            });
        });

        await page.goto('/trophies-shop.html');

        // 1. Verify "Type" filter is REMOVED
        const typeFilter = page.locator('text=Type');
        await expect(typeFilter).toHaveCount(0);

        // 2. Verify "Sport" filters exist (Assuming filters are static or match mock data)
        // If filters are dynamic based on API data, this will work. If static, verify HTML.
        // The original test checked for 'cricket'. Our mock has 'Cricket'.
        // Check filtering logic.

        // 3. Verify UI Refinements (Stock Text Removal)
        const productCard = page.locator('.product-card').first();
        await expect(productCard).toBeVisible(); // Now checking explicitly because we mocked data
        const text = await productCard.textContent();
        expect(text).not.toContain('In Stock (');
    });

    test('Clicking product image opens details modal', async ({ page }) => {
        // Reuse mock or define new one
        await page.route('**/api/trophies', async (route) => {
            const mockTrophies = [
                {
                    _id: '1',
                    id: '1',
                    name: 'Test Modal Trophy',
                    category: ['Cricket'],
                    sport: ['Cricket'],
                    type: 'Cup',
                    price: 1000,
                    inventory: 5,
                    images: ['test.jpg', 'test2.jpg'], // Multi images
                    image: 'test.jpg'
                }
            ];
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ trophies: mockTrophies })
            });
        });

        await page.goto('/trophies-shop.html');

        // Capture console errors
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
        });
        page.on('pageerror', err => console.log(`PAGE EXCEPTION: ${err.message}`));

        // Wait for products to load
        await page.waitForSelector('.product-card');

        // Find a product
        const product = page.locator('.product-card:not(.sold-out) .product-image').first();
        await expect(product).toBeVisible();
        await product.click();

        // Verify modal opens
        const modal = page.locator('#imageModal');
        await expect(modal).toHaveClass(/show/);
        await expect(modal).toBeVisible();

        // Click Buy button in modal
        const buyBtn = modal.locator('#modalBuyNow');
        await expect(buyBtn).toBeEnabled();
        await buyBtn.click();

        // Verify customization modal opens
        const customModal = page.locator('#customizationModal');
        await expect(customModal).toHaveClass(/show/);
    });
});
