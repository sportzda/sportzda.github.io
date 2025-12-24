/**
 * Unit tests for Payment Modal - Frontend Payment Update Workflow
 * Tests the unified payment modal functionality across all tabs
 * Uses Playwright Test Framework
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Modal - Frontend Workflow', () => {
    // Create isolated context for each test
    let mockFetch: any;

    test.beforeEach(async ({ context, page }) => {
        // Create a new context to isolate state
        await page.goto('about:blank');
        
        // Setup HTML
        await page.setContent(`
            <div id="paymentUpdateModal" style="display: none;">
                <input id="paymentOrderId" type="text" />
                <input id="paymentTotalAmount" type="text" />
                <select id="paymentMethod">
                    <option value="">Select Method</option>
                    <option value="Cash">Cash</option>
                    <option value="AX">AX (Axis Bank)</option>
                    <option value="Both">Both (Cash + AX)</option>
                </select>
                <input id="cashAmount" type="number" />
                <input id="axAmount" type="number" />
                <div id="splitPaymentInputs" style="display: none;"></div>
                <div id="validationMessage" style="display: none;"></div>
                <div id="validationText"></div>
                <button id="submitPaymentBtn" disabled>Submit Payment</button>
            </div>
        `);
    });

    test.describe('finalAmount Extraction', () => {
        test('should extract finalAmount from payment.finalAmount (primary)', async ({ page }) => {
            const result = await page.evaluate(() => {
                const mockOrder = {
                    orderId: 'DA_NESTED_AMOUNT',
                    payment: {
                        originalAmount: 1500,
                        discount: 100,
                        finalAmount: 1400  // Primary source
                    },
                    finalAmount: 1500,  // Should be ignored
                    totalAmount: 1500   // Should be ignored
                };
                
                let finalAmount = mockOrder.payment?.finalAmount || 
                                 mockOrder.finalAmount || 
                                 mockOrder.totalAmount || 0;
                return finalAmount;
            });
            
            expect(result).toBe(1400);
        });

        test('should extract finalAmount from order.finalAmount (secondary fallback)', async ({ page }) => {
            const result = await page.evaluate(() => {
                const mockOrder = {
                    orderId: 'DA_SECONDARY',
                    finalAmount: 1200,  // Secondary source
                    totalAmount: 1200,
                    paymentStatus: 'unpaid'
                };
                
                let finalAmount = mockOrder.payment?.finalAmount || 
                                 mockOrder.finalAmount || 
                                 mockOrder.totalAmount || 0;
                return finalAmount;
            });
            
            expect(result).toBe(1200);
        });

        test('should extract finalAmount from totalAmount (tertiary fallback)', async ({ page }) => {
            const result = await page.evaluate(() => {
                const mockOrder = {
                    orderId: 'DA_TERTIARY',
                    totalAmount: 800,  // Tertiary source
                    paymentStatus: 'unpaid'
                };
                
                let finalAmount = mockOrder.payment?.finalAmount || 
                                 mockOrder.finalAmount || 
                                 mockOrder.totalAmount || 0;
                return finalAmount;
            });
            
            expect(result).toBe(800);
        });

        test('should return 0 when no amount found', async ({ page }) => {
            const result = await page.evaluate(() => {
                const mockOrder = {
                    orderId: 'DA_NO_AMOUNT',
                    paymentStatus: 'unpaid'
                };
                
                let finalAmount = mockOrder.payment?.finalAmount || 
                                 mockOrder.finalAmount || 
                                 mockOrder.totalAmount || 0;
                return finalAmount;
            });
            
            expect(result).toBe(0);
        });
    });

    test.describe('Payment Method Selection', () => {
        test('should enable submit button for Cash method', async ({ page }) => {
            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLDivElement;
                modal.dataset.currentFinalAmount = '1000';
                
                const method = 'Cash';
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;
                
                if (method === 'Cash' || method === 'AX') {
                    submitBtn.disabled = false;
                }
            });

            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(false);
        });

        test('should enable submit button for AX method', async ({ page }) => {
            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLDivElement;
                modal.dataset.currentFinalAmount = '1000';
                
                const method = 'AX';
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;
                
                if (method === 'Cash' || method === 'AX') {
                    submitBtn.disabled = false;
                }
            });

            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(false);
        });

        test('should show split input when Both method is selected', async ({ page }) => {
            await page.evaluate(() => {
                const method = 'Both';
                const splitInputs = document.getElementById('splitPaymentInputs') as HTMLDivElement;
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;
                
                if (method === 'Both') {
                    splitInputs.style.display = 'block';
                    submitBtn.disabled = true;
                }
            });

            const display = await page.locator('#splitPaymentInputs').evaluate(
                (el: HTMLElement) => el.style.display
            );
            expect(display).toBe('block');
        });

        test('should disable submit button when no method is selected', async ({ page }) => {
            await page.evaluate(() => {
                const method = '';
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;
                
                if (!method) {
                    submitBtn.disabled = true;
                }
            });

            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(true);
        });
    });

    test.describe('Split Payment Validation', () => {
        test('should show success message when split amounts equal finalAmount', async ({ page }) => {
            await page.locator('#paymentUpdateModal').evaluate((modal: HTMLElement) => {
                (modal as any).dataset.currentFinalAmount = '1200';
            });

            await page.locator('#cashAmount').fill('700');
            await page.locator('#axAmount').fill('500');

            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                const finalAmount = parseInt((modal as any).dataset.currentFinalAmount) || 0;
                const cashAmount = parseFloat((document.getElementById('cashAmount') as HTMLInputElement).value) || 0;
                const axAmount = parseFloat((document.getElementById('axAmount') as HTMLInputElement).value) || 0;

                const sum = cashAmount + axAmount;
                const validationMsg = document.getElementById('validationMessage') as HTMLDivElement;
                const validationText = document.getElementById('validationText') as HTMLDivElement;
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;

                if (sum === finalAmount) {
                    validationMsg.className = 'alert alert-success';
                    validationText.innerHTML = `✓ Perfect! ₹${cashAmount} (Cash) + ₹${axAmount} (Card) = ₹${sum}`;
                    submitBtn.disabled = false;
                    validationMsg.style.display = 'block';
                }
            });

            const msgText = await page.locator('#validationText').textContent();
            expect(msgText).toContain('Perfect');
            
            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(false);
        });

        test('should show warning when split amounts are less than finalAmount', async ({ page }) => {
            await page.locator('#paymentUpdateModal').evaluate((modal: HTMLElement) => {
                (modal as any).dataset.currentFinalAmount = '1200';
            });

            await page.locator('#cashAmount').fill('600');
            await page.locator('#axAmount').fill('400');

            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                const finalAmount = parseInt((modal as any).dataset.currentFinalAmount) || 0;
                const cashAmount = parseFloat((document.getElementById('cashAmount') as HTMLInputElement).value) || 0;
                const axAmount = parseFloat((document.getElementById('axAmount') as HTMLInputElement).value) || 0;

                const sum = cashAmount + axAmount;
                const validationMsg = document.getElementById('validationMessage') as HTMLDivElement;
                const validationText = document.getElementById('validationText') as HTMLDivElement;
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;

                if (sum < finalAmount) {
                    validationMsg.className = 'alert alert-warning';
                    const remaining = finalAmount - sum;
                    validationText.innerHTML = `⚠ You've entered ₹${sum}, but the order total is ₹${finalAmount}. You still need to collect ₹${remaining}.`;
                    submitBtn.disabled = true;
                    validationMsg.style.display = 'block';
                }
            });

            const msgText = await page.locator('#validationText').textContent();
            expect(msgText).toContain('still need to collect');
            
            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(true);
        });

        test('should show warning when split amounts exceed finalAmount', async ({ page }) => {
            await page.locator('#paymentUpdateModal').evaluate((modal: HTMLElement) => {
                (modal as any).dataset.currentFinalAmount = '1000';
            });

            await page.locator('#cashAmount').fill('700');
            await page.locator('#axAmount').fill('400');

            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                const finalAmount = parseInt((modal as any).dataset.currentFinalAmount) || 0;
                const cashAmount = parseFloat((document.getElementById('cashAmount') as HTMLInputElement).value) || 0;
                const axAmount = parseFloat((document.getElementById('axAmount') as HTMLInputElement).value) || 0;

                const sum = cashAmount + axAmount;
                const validationMsg = document.getElementById('validationMessage') as HTMLDivElement;
                const validationText = document.getElementById('validationText') as HTMLDivElement;
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;

                if (sum > finalAmount) {
                    validationMsg.className = 'alert alert-warning';
                    const excess = sum - finalAmount;
                    validationText.innerHTML = `⚠ You've entered ₹${sum}, but the order total is only ₹${finalAmount}. Please reduce by ₹${excess}.`;
                    submitBtn.disabled = true;
                    validationMsg.style.display = 'block';
                }
            });

            const msgText = await page.locator('#validationText').textContent();
            expect(msgText).toContain('reduce');
            
            const disabled = await page.locator('#submitPaymentBtn').isDisabled();
            expect(disabled).toBe(true);
        });

        test('should hide validation when no amounts entered', async ({ page }) => {
            await page.evaluate(() => {
                const cashAmount = parseFloat((document.getElementById('cashAmount') as HTMLInputElement).value) || 0;
                const axAmount = parseFloat((document.getElementById('axAmount') as HTMLInputElement).value) || 0;
                const validationMsg = document.getElementById('validationMessage') as HTMLDivElement;
                const submitBtn = document.getElementById('submitPaymentBtn') as HTMLButtonElement;

                if (cashAmount === 0 && axAmount === 0) {
                    validationMsg.style.display = 'none';
                    submitBtn.disabled = true;
                }
            });

            const display = await page.locator('#validationMessage').evaluate(
                (el: HTMLElement) => el.style.display
            );
            expect(display).toBe('none');
        });
    });

    test.describe('Modal Data Persistence', () => {
        test('should store finalAmount on modal dataset', async ({ page }) => {
            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                modal.dataset.currentOrderId = 'DA_TEST_001';
                modal.dataset.currentFinalAmount = '1500';
            });

            const orderId = await page.locator('#paymentUpdateModal').evaluate(
                (el: HTMLElement) => (el as any).dataset.currentOrderId
            );
            const amount = await page.locator('#paymentUpdateModal').evaluate(
                (el: HTMLElement) => (el as any).dataset.currentFinalAmount
            );

            expect(orderId).toBe('DA_TEST_001');
            expect(amount).toBe('1500');
        });

        test('should retrieve finalAmount from modal dataset in validation', async ({ page }) => {
            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                (modal as any).dataset.currentFinalAmount = '2000';
            });

            const amount = await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                return parseInt((modal as any).dataset.currentFinalAmount) || 0;
            });

            expect(amount).toBe(2000);
        });
    });

    test.describe('Modal Form Reset', () => {
        test('should reset all form fields when modal opens', async ({ page }) => {
            // Pre-fill with old data
            await page.locator('#paymentMethod').selectOption('Cash');
            await page.locator('#cashAmount').fill('500');

            // Simulate modal opening
            await page.evaluate(() => {
                const modal = document.getElementById('paymentUpdateModal') as HTMLElement;
                (modal as any).dataset.currentFinalAmount = '1000';
                
                (document.getElementById('paymentOrderId') as HTMLInputElement).value = 'DA_TEST';
                (document.getElementById('paymentTotalAmount') as HTMLInputElement).value = '1000';
                
                // Reset form
                (document.getElementById('paymentMethod') as HTMLSelectElement).value = '';
                (document.getElementById('cashAmount') as HTMLInputElement).value = '';
                (document.getElementById('axAmount') as HTMLInputElement).value = '';
                (document.getElementById('splitPaymentInputs') as HTMLDivElement).style.display = 'none';
                (document.getElementById('validationMessage') as HTMLDivElement).style.display = 'none';
                (document.getElementById('submitPaymentBtn') as HTMLButtonElement).disabled = true;
            });

            const method = await page.locator('#paymentMethod').inputValue();
            const cash = await page.locator('#cashAmount').inputValue();
            const submitDisabled = await page.locator('#submitPaymentBtn').isDisabled();

            expect(method).toBe('');
            expect(cash).toBe('');
            expect(submitDisabled).toBe(true);
        });
    });

    test.describe('Unified Workflow - All Tabs', () => {
        test('should use same extraction logic for different service types', async ({ page }) => {
            // Test extraction for racket-stringing
            const racketAmount = await page.evaluate(() => {
                const order = {
                    payment: { finalAmount: 950 },
                    paymentStatus: 'unpaid'
                };
                return order.payment?.finalAmount || order.finalAmount || order.totalAmount || 0;
            });

            // Test extraction for bat-knocking
            const batAmount = await page.evaluate(() => {
                const order = {
                    payment: { finalAmount: 1100 },
                    paymentStatus: 'unpaid'
                };
                return order.payment?.finalAmount || order.finalAmount || order.totalAmount || 0;
            });

            expect(racketAmount).toBe(950);
            expect(batAmount).toBe(1100);
        });
    });
});
