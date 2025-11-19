import { test, expect } from '@playwright/test';

test.describe('Services Landing Page Tests', () => {
    test.describe('Page Structure', () => {
        test('Page loads successfully', async ({ page }) => {
            await page.goto('/services.html');
            await expect(page).toHaveTitle(/Book Your Service.*DA SPORTZ/i);
        });

        test('Top bar displays correct information', async ({ page }) => {
            await page.goto('/services.html');

            const topBar = page.locator('.top-bar');
            await expect(topBar).toBeVisible();
            await expect(topBar).toContainText('+91 88005 05769');
            await expect(topBar).toContainText('Mon-Sun: 9:00 AM - 9:00 PM');
        }); test('Offer bar displays bulk booking discount', async ({ page }) => {
            await page.goto('/services.html');

            const offerBar = page.locator('.offer-bar');
            await expect(offerBar).toBeVisible();
            await expect(offerBar).toContainText('Get Discounts on Bulk Bookings');
        });

        test('Navigation bar has all required links', async ({ page }) => {
            await page.goto('/services.html');

            // Check brand name
            const brand = page.locator('.navbar-brand');
            await expect(brand).toHaveText('DA SPORTZ');

            // Check navigation links
            const homeLink = page.locator('a.nav-link[href="index.html"]').first();
            const aboutLink = page.locator('a.nav-link[href="index.html#about"]');
            const contactLink = page.locator('a.nav-link[href="index.html#contact"]');

            await expect(homeLink).toBeVisible();
            await expect(homeLink).toContainText('Home');
            await expect(aboutLink).toBeVisible();
            await expect(aboutLink).toContainText('About');
            await expect(contactLink).toBeVisible();
            await expect(contactLink).toContainText('Contact');
        });

        test('Navigation links have icons', async ({ page }) => {
            await page.goto('/services.html');

            const homeIcon = page.locator('a.nav-link[href="index.html"] i.bi-house-door').first();
            const aboutIcon = page.locator('a.nav-link[href="index.html#about"] i.bi-info-circle');
            const contactIcon = page.locator('a.nav-link[href="index.html#contact"] i.bi-telephone');

            await expect(homeIcon).toBeVisible();
            await expect(aboutIcon).toBeVisible();
            await expect(contactIcon).toBeVisible();
        });
    });

    test.describe('Service Cards', () => {
        test('Page title is displayed', async ({ page }) => {
            await page.goto('/services.html');

            const title = page.locator('.page-title');
            await expect(title).toBeVisible();
            await expect(title).toHaveText('Select Your Service');
        });

        test('Both service cards are visible', async ({ page }) => {
            await page.goto('/services.html');

            const serviceCards = page.locator('.service-button-card');
            await expect(serviceCards).toHaveCount(2);
        });

        test('Racket stringing card has correct content', async ({ page }) => {
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');
            await expect(racketCard).toBeVisible();

            const title = racketCard.locator('.service-title');
            await expect(title).toHaveText('Racket Stringing');

            const subtitle = racketCard.locator('.service-subtitle');
            await expect(subtitle).toHaveText('Professional badminton racket stringing');

            const image = racketCard.locator('img[alt="Racket Stringing"]');
            await expect(image).toBeVisible();
            await expect(image).toHaveAttribute('src', 'img/racket-stringing.jpg');
        });

        test('Bat knocking card has correct content', async ({ page }) => {
            await page.goto('/services.html');

            const batCard = page.locator('a[href="bat-knocking.html"]');
            await expect(batCard).toBeVisible();

            const title = batCard.locator('.service-title');
            await expect(title).toHaveText('Machine Bat Knocking');

            const subtitle = batCard.locator('.service-subtitle');
            await expect(subtitle).toHaveText('Professional cricket bat machine knocking');

            const image = batCard.locator('img[alt="Machine Bat Knocking"]');
            await expect(image).toBeVisible();
            await expect(image).toHaveAttribute('src', 'img/machine_knocking.jpg');
        });

        test('Service images have consistent sizing', async ({ page }) => {
            await page.goto('/services.html');

            const racketImage = page.locator('a[href="stringing-booking.html"] img');
            const batImage = page.locator('a[href="bat-knocking.html"] img');

            // Both images should have same width and height
            const racketBox = await racketImage.boundingBox();
            const batBox = await batImage.boundingBox();

            expect(racketBox).toBeTruthy();
            expect(batBox).toBeTruthy();
            expect(racketBox!.width).toBe(batBox!.width);
            expect(racketBox!.height).toBe(batBox!.height);
        });
    });

    test.describe('Interactive Behavior', () => {
        test('Racket stringing card is clickable', async ({ page }) => {
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');
            await expect(racketCard).toBeVisible();

            // Click should navigate to stringing booking page
            await racketCard.click();
            await expect(page).toHaveURL(/stringing-booking\.html/);
        });

        test('Bat knocking card is clickable', async ({ page }) => {
            await page.goto('/services.html');

            const batCard = page.locator('a[href="bat-knocking.html"]');
            await expect(batCard).toBeVisible();

            // Click should navigate to bat knocking page
            await batCard.click();
            await expect(page).toHaveURL(/bat-knocking\.html/);
        });

        test('Service cards have hover effects', async ({ page }) => {
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');

            // Get initial box position
            const initialBox = await racketCard.boundingBox();
            expect(initialBox).toBeTruthy();

            // Hover over card
            await racketCard.hover();

            // Wait a moment for animation
            await page.waitForTimeout(400);

            // Card should have border color on hover (checking if style changed)
            const borderColor = await racketCard.evaluate(el =>
                window.getComputedStyle(el).borderColor
            );

            // Orange border should be applied (rgb(255, 89, 0))
            expect(borderColor).toContain('255');
        });

        test('Images scale on hover', async ({ page }) => {
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');
            const image = racketCard.locator('img');

            // Get initial transform
            const initialTransform = await image.evaluate(el =>
                window.getComputedStyle(el).transform
            );

            // Hover over card
            await racketCard.hover();
            await page.waitForTimeout(400);

            // Get transform after hover
            const hoverTransform = await image.evaluate(el =>
                window.getComputedStyle(el).transform
            );

            // Transform should change (scale applied)
            expect(hoverTransform).not.toBe(initialTransform);
        });
    });

    test.describe('Footer', () => {
        test('Footer displays company information', async ({ page }) => {
            await page.goto('/services.html');

            const footer = page.locator('footer');
            await expect(footer).toBeVisible();
            await expect(footer).toContainText('DA SPORTZ');
            await expect(footer).toContainText('Your one-stop shop for premium sports gear');
        });

        test('Footer Quick Links section exists', async ({ page }) => {
            await page.goto('/services.html');

            const quickLinks = page.locator('footer').getByText('Quick Links');
            await expect(quickLinks).toBeVisible();
        });

        test('Footer Quick Links have correct color styling', async ({ page }) => {
            await page.goto('/services.html');

            // Check first link in Quick Links section
            const footerLink = page.locator('footer a[href="index.html"]').first();
            await expect(footerLink).toBeVisible();

            // Get computed color (should be accent orange)
            const color = await footerLink.evaluate(el =>
                window.getComputedStyle(el).color
            );

            // Should be orange (rgb(255, 89, 0))
            expect(color).toContain('255');
        });

        test('Footer contains all required links', async ({ page }) => {
            await page.goto('/services.html');

            const footer = page.locator('footer');

            // Check for specific links
            await expect(footer.locator('a[href="index.html"]').first()).toBeVisible();
            await expect(footer.locator('a[href="index.html#about"]')).toBeVisible();
            await expect(footer.locator('a[href="index.html#contact"]')).toBeVisible();
            await expect(footer.locator('a[href="terms.html"]')).toBeVisible();
            await expect(footer.locator('a[href="refund_cancellation.html"]')).toBeVisible();
        });

        test('Footer has social media links', async ({ page }) => {
            await page.goto('/services.html');

            const footer = page.locator('footer');
            await expect(footer).toContainText('Follow Us');

            const instagramIcon = footer.locator('i.bi-instagram');
            const emailIcon = footer.locator('i.bi-envelope');

            await expect(instagramIcon).toBeVisible();
            await expect(emailIcon).toBeVisible();
        });

        test('Footer displays copyright', async ({ page }) => {
            await page.goto('/services.html');

            const footer = page.locator('footer');
            await expect(footer).toContainText('© 2025 DA SPORTZ. All Rights Reserved.');
        });
    });

    test.describe('Responsive Design', () => {
        test('Page is mobile responsive', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
            await page.goto('/services.html');

            // Check that main elements are visible
            const topBar = page.locator('.top-bar');
            const offerBar = page.locator('.offer-bar');
            const title = page.locator('.page-title');
            const cards = page.locator('.service-button-card');

            await expect(topBar).toBeVisible();
            await expect(offerBar).toBeVisible();
            await expect(title).toBeVisible();
            await expect(cards).toHaveCount(2);
        });

        test('Navigation is collapsible on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/services.html');

            // Hamburger menu should be visible
            const navToggle = page.locator('.navbar-toggler');
            await expect(navToggle).toBeVisible();

            // Navigation menu should be collapsed initially
            const navMenu = page.locator('#navbarNav');
            const isCollapsed = await navMenu.evaluate(el =>
                !el.classList.contains('show')
            );
            expect(isCollapsed).toBeTruthy();

            // Click hamburger to expand
            await navToggle.click();
            await expect(navMenu).toHaveClass(/show/);
        });

        test('Service cards stack vertically on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');
            const batCard = page.locator('a[href="bat-knocking.html"]');

            const racketBox = await racketCard.boundingBox();
            const batBox = await batCard.boundingBox();

            expect(racketBox).toBeTruthy();
            expect(batBox).toBeTruthy();

            // On mobile, cards should stack (bat card should be below racket card)
            expect(batBox!.y).toBeGreaterThan(racketBox!.y);
        });

        test('Images maintain proper size on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/services.html');

            const images = page.locator('.service-icon img');
            await expect(images).toHaveCount(2);

            // Both images should be visible and have same dimensions
            const firstBox = await images.nth(0).boundingBox();
            const secondBox = await images.nth(1).boundingBox();

            expect(firstBox).toBeTruthy();
            expect(secondBox).toBeTruthy();
            expect(firstBox!.width).toBe(secondBox!.width);
            expect(firstBox!.height).toBe(secondBox!.height);
        });

        test('Page works on tablet viewport', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 }); // iPad
            await page.goto('/services.html');

            const cards = page.locator('.service-button-card');
            await expect(cards).toHaveCount(2);

            // Both cards should be visible and clickable
            await expect(cards.first()).toBeVisible();
            await expect(cards.last()).toBeVisible();
        });
    });

    test.describe('Accessibility', () => {
        test('Images have alt text', async ({ page }) => {
            await page.goto('/services.html');

            const racketImage = page.locator('img[alt="Racket Stringing"]');
            const batImage = page.locator('img[alt="Machine Bat Knocking"]');

            await expect(racketImage).toHaveAttribute('alt', 'Racket Stringing');
            await expect(batImage).toHaveAttribute('alt', 'Machine Bat Knocking');
        });

        test('Service cards are keyboard accessible', async ({ page }) => {
            await page.goto('/services.html');

            // Tab to first card
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab'); // Navigate through navbar items

            const racketCard = page.locator('a[href="stringing-booking.html"]');

            // Check if card is focused
            const isFocused = await racketCard.evaluate(el => el === document.activeElement);

            // Press Enter to activate
            if (isFocused) {
                await page.keyboard.press('Enter');
                await expect(page).toHaveURL(/stringing-booking\.html/);
            }
        });

        test('Links have proper href attributes', async ({ page }) => {
            await page.goto('/services.html');

            const racketCard = page.locator('a[href="stringing-booking.html"]');
            const batCard = page.locator('a[href="bat-knocking.html"]');

            await expect(racketCard).toHaveAttribute('href', 'stringing-booking.html');
            await expect(batCard).toHaveAttribute('href', 'bat-knocking.html');
        });
    });

    test.describe('Visual Styling', () => {
        test('Service cards have consistent styling', async ({ page }) => {
            await page.goto('/services.html');

            const cards = page.locator('.service-button-card');

            // Check both cards have same border-radius
            const card1Radius = await cards.nth(0).evaluate(el =>
                window.getComputedStyle(el).borderRadius
            );
            const card2Radius = await cards.nth(1).evaluate(el =>
                window.getComputedStyle(el).borderRadius
            );

            expect(card1Radius).toBe(card2Radius);
        });

        test('Service titles are properly styled', async ({ page }) => {
            await page.goto('/services.html');

            const titles = page.locator('.service-title');
            await expect(titles).toHaveCount(2);

            // Check font weight
            const fontWeight = await titles.first().evaluate(el =>
                window.getComputedStyle(el).fontWeight
            );

            // Should be bold (700)
            expect(fontWeight).toBe('700');
        });

        test('Page uses Barlow font family', async ({ page }) => {
            await page.goto('/services.html');

            const body = page.locator('body');
            const fontFamily = await body.evaluate(el =>
                window.getComputedStyle(el).fontFamily
            );

            expect(fontFamily).toContain('Barlow');
        });
    });
});
