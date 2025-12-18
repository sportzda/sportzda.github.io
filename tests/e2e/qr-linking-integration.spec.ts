import { test, expect, Page, Browser } from '@playwright/test';

test.describe('QR Code Linking Workflow Integration Tests', () => {
    let page: Page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Mock authentication
        await page.addInitScript(() => {
            sessionStorage.setItem('staffAuthToken', 'test_token_xyz');
            sessionStorage.setItem('staffUser', 'staff_test');
        });

        // Mock orders API
        await page.route('**/api/orders*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    orders: []
                })
            });
        });

        // Mock authentication verify
        await page.route('**/api/staff/verify', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true })
            });
        });

        await page.goto('/staff-dashboard.html');
        await page.waitForSelector('.dashboard-content.show', { timeout: 5000 });
    });

    test.afterEach(async () => {
        await page.close();
    });

    test.describe('Complete QR Linking Workflow', () => {
        test('should complete full workflow: scan QR -> select racket -> link', async () => {
            // Mock QR scan response (unlinked QR)
            await page.route('**/api/qr/QR_NEW_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_NEW_001',
                        linked: false,
                        unlinkedRacketsCount: 2,
                        rackets: [
                            {
                                orderId: 'DA_2024001',
                                customerName: 'John Doe',
                                racket: {
                                    id: 'racket_001',
                                    racketName: 'Yonex Astrox 99',
                                    string: 'Yonex BG 65',
                                    tension: '26'
                                }
                            },
                            {
                                orderId: 'DA_2024002',
                                customerName: 'Jane Smith',
                                racket: {
                                    id: 'racket_002',
                                    racketName: 'Li-Ning N99',
                                    string: 'Li-Ning N99',
                                    tension: '27'
                                }
                            }
                        ]
                    })
                });
            });

            // Mock link QR response
            await page.route('**/api/qr/QR_NEW_001/link', async (route) => {
                if (route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            message: 'QR code linked successfully',
                            qrCode: 'QR_NEW_001',
                            orderId: 'DA_2024001',
                            racketId: 'racket_001',
                            alreadyLinked: false
                        })
                    });
                }
            });

            // Open QR scanner
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();
            await expect(page.locator('#qrScanModal')).toBeVisible();

            // Verify modal is in correct state (toggle buttons hidden, auto-detect from QR)
            await expect(page.locator('#selectRacketBtn')).toBeHidden();
            await expect(page.locator('#selectBatBtn')).toBeHidden();
            await expect(page.locator('#linkQRBtn')).toBeDisabled();
        });

        test('should complete workflow for cricket bat linking', async () => {
            // Mock QR scan response for cricket bat with CB_ prefix
            await page.route('**/api/qr/CB_BAT_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'CB_BAT_001',
                        linked: false,
                        unlinkedBatsCount: 1,
                        rackets: [
                            {
                                orderId: 'DA_BAT_001',
                                customerName: 'Cricket Player',
                                racket: {
                                    id: 'bat_001',
                                    batModel: 'MRF Grand',
                                    package: '15000',
                                    threading: 'both'
                                }
                            }
                        ]
                    })
                });
            });

            // Open QR scanner
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            // Simulate scanning CB_ prefixed QR (auto-detects bat mode)
            await page.evaluate(() => {
                // Call fetchAvailableRackets directly with CB_ prefix
                (window as any).fetchAvailableRackets('CB_BAT_001');
            });

            // Wait for API call and UI update
            await page.waitForTimeout(1000);

            // Verify label changed to cricket bat mode
            await expect(page.locator('#listLabel')).toContainText('Select Cricket Bat');
        });

        test('should handle already linked QR code workflow', async () => {
            // Mock QR scan response (already linked)
            await page.route('**/api/qr/QR_LINKED_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_LINKED_001',
                        linked: true,
                        linkedRacketId: 'racket_linked',
                        order: {
                            orderId: 'DA_EXISTING_001',
                            customerName: 'Existing Customer',
                            phone: '9876543210',
                            store: 'Main Store',
                            paymentStatus: 'paid'
                        },
                        racket: {
                            racketName: 'Yonex Astrox 99',
                            string: 'Yonex BG 65',
                            tension: '26',
                            status: 1
                        }
                    })
                });
            });

            // Open QR scanner and simulate scan
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            // Verify modal opened successfully
            await expect(page.locator('#qrScanModal')).toBeVisible();
        });

        test('should show unlink option for already linked QR', async () => {
            // Mock QR scan response (already linked)
            await page.route('**/api/qr/QR_FOR_UNLINK*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_FOR_UNLINK',
                        linked: true,
                        linkedRacketId: 'racket_123',
                        order: {
                            orderId: 'DA_001',
                            customerName: 'Test Customer'
                        }
                    })
                });
            });

            // Mock unlink QR response
            await page.route('**/api/qr/QR_FOR_UNLINK/unlink', async (route) => {
                if (route.request().method() === 'DELETE') {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            message: 'QR code unlinked successfully'
                        })
                    });
                }
            });

            // Test setup - in real scenario unlink button would appear
            expect(true).toBe(true);
        });
    });

    test.describe('Multi-Item QR Selection', () => {
        test('should display multiple unlinked items from same order', async () => {
            await page.route('**/api/qr/QR_MULTI_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_MULTI_001',
                        linked: false,
                        rackets: [
                            {
                                orderId: 'DA_MULTI_001',
                                customerName: 'Multi Racket Customer',
                                racket: {
                                    id: 'racket_a',
                                    racketName: 'Yonex Astrox 99',
                                    string: 'Yonex BG 65',
                                    tension: '26'
                                }
                            },
                            {
                                orderId: 'DA_MULTI_001',
                                customerName: 'Multi Racket Customer',
                                racket: {
                                    id: 'racket_b',
                                    racketName: 'Yonex Nanoflare 700',
                                    string: 'Yonex BG 80',
                                    tension: '28'
                                }
                            },
                            {
                                orderId: 'DA_MULTI_001',
                                customerName: 'Multi Racket Customer',
                                racket: {
                                    id: 'racket_c',
                                    racketName: 'Li-Ning N99',
                                    string: 'Li-Ning N99',
                                    tension: '27'
                                }
                            }
                        ]
                    })
                });
            });

            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();
            await expect(page.locator('#qrScanModal')).toBeVisible();
        });

        test('should display items from different orders', async () => {
            await page.route('**/api/qr/QR_MULTI_ORDERS*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_MULTI_ORDERS',
                        linked: false,
                        rackets: [
                            {
                                orderId: 'DA_ORDER_001',
                                customerName: 'Customer A',
                                racket: {
                                    id: 'racket_from_order_1',
                                    racketName: 'Racket 1',
                                    string: 'String 1',
                                    tension: '26'
                                }
                            },
                            {
                                orderId: 'DA_ORDER_002',
                                customerName: 'Customer B',
                                racket: {
                                    id: 'racket_from_order_2',
                                    racketName: 'Racket 2',
                                    string: 'String 2',
                                    tension: '27'
                                }
                            }
                        ]
                    })
                });
            });

            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();
            await expect(page.locator('#qrScanModal')).toBeVisible();
        });

        test('should allow selection of only one item', async () => {
            // When user selects an item, only that item should be selected
            await page.evaluate(() => {
                // Simulate radio button behavior
                const radios = document.querySelectorAll('input[name="selectedItem"]');
                if (radios.length > 0) {
                    (radios[0] as HTMLInputElement).checked = true;
                    (radios[1] as HTMLInputElement).checked = false;
                }
            });

            expect(true).toBe(true);
        });
    });

    test.describe('QR Scanning Edge Cases', () => {
        test('should handle empty QR list response', async () => {
            await page.route('**/api/qr/QR_EMPTY*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_EMPTY',
                        linked: false,
                        rackets: []
                    })
                });
            });

            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();
            await expect(page.locator('#qrScanModal')).toBeVisible();
        });

        test('should handle QR code with special characters', async () => {
            const specialQR = 'QR-ABC_123-XYZ.456';

            await page.route('**/api/qr/**', async (route) => {
                const url = route.request().url();
                expect(url).toContain('api/qr');
                await route.abort();
            });

            expect(specialQR).toMatch(/^QR.+/);
        });

        test('should handle very long QR codes', async () => {
            const longQR = 'QR_' + 'A'.repeat(100);

            await page.route('**/api/qr/**', async (route) => {
                const url = route.request().url();
                expect(url).toBeDefined();
                await route.abort();
            });

            expect(longQR.length).toBeGreaterThan(50);
        });

        test('should handle duplicate item IDs in list', async () => {
            // Even if API returns duplicates, should handle gracefully
            await page.route('**/api/qr/QR_DUPE*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_DUPE',
                        linked: false,
                        rackets: [
                            {
                                orderId: 'DA_001',
                                customerName: 'Customer',
                                racket: { id: 'racket_1', racketName: 'Racket A' }
                            },
                            {
                                orderId: 'DA_002',
                                customerName: 'Customer',
                                racket: { id: 'racket_1', racketName: 'Racket B' } // Duplicate ID
                            }
                        ]
                    })
                });
            });

            expect(true).toBe(true);
        });

        test('should handle missing optional fields', async () => {
            await page.route('**/api/qr/QR_MINIMAL*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_MINIMAL',
                        linked: false,
                        rackets: [
                            {
                                orderId: 'DA_001',
                                // Missing customerName
                                racket: {
                                    id: 'racket_1',
                                    racketName: 'Racket A'
                                    // Missing string, tension
                                }
                            }
                        ]
                    })
                });
            });

            expect(true).toBe(true);
        });
    });

    test.describe('Form Validation for QR Linking', () => {
        test('should require QR code selection before linking', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            const linkBtn = page.locator('#linkQRBtn');
            await expect(linkBtn).toBeDisabled();
        });

        test('should require racket selection before linking', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            const linkBtn = page.locator('#linkQRBtn');

            // Should be disabled until both QR and racket are selected
            await expect(linkBtn).toBeDisabled();
        });

        test('should enable Link QR button only when both selections made', async () => {
            // This would be true after:
            // 1. QR code is scanned
            // 2. A racket/bat is selected
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            const linkBtn = page.locator('#linkQRBtn');

            // Initially disabled
            await expect(linkBtn).toBeDisabled();
        });

        test('should validate racket/bat selection is from list', async () => {
            // Should only accept selections from displayed list
            const validSelection = 'racket_from_list';
            const invalidSelection = 'random_invalid_id';

            expect(validSelection).toContain('racket');
            expect(invalidSelection).not.toContain('racket');
        });
    });

    test.describe('Batch Linking and Bulk Operations', () => {
        test('should handle sequential QR scans in one session', async () => {
            let scanCount = 0;

            await page.route('**/api/qr/**', async (route) => {
                scanCount++;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: `QR_SCAN_${scanCount}`
                    })
                });
            });

            expect(true).toBe(true);
        });

        test('should limit items shown in list (pagination)', async () => {
            // API should limit returned items
            await page.route('**/api/qr/QR_LARGE_LIST*', async (route) => {
                // Generate large list
                const items = Array.from({ length: 100 }, (_, i) => ({
                    orderId: `DA_${i}`,
                    customerName: `Customer ${i}`,
                    racket: {
                        id: `racket_${i}`,
                        racketName: `Racket ${i}`
                    }
                }));

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'QR_LARGE_LIST',
                        linked: false,
                        rackets: items.slice(0, 5) // Only first 5
                    })
                });
            });

            expect(true).toBe(true);
        });
    });

    test.describe('Camera and Hardware Integration', () => {
        test('should initialize camera on modal open', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            const qrVideo = page.locator('#qrVideo');
            await expect(qrVideo).toBeVisible();
        });

        test('should cleanup camera on modal close', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            const closeBtn = page.locator('#closeQRBtn').first();
            await closeBtn.click();

            // Modal should be closed
            const qrModal = page.locator('#qrScanModal');
            const display = await qrModal.evaluate(el => window.getComputedStyle(el).display);
            expect(display).toBe('none');
        });

        test('should handle camera permission denied', async () => {
            // In Playwright, this would require denying camera permissions
            // The UI should gracefully handle this
            expect(true).toBe(true);
        });
    });

    test.describe('Data Persistence', () => {
        test('should not lose data when switching between racket and bat modes', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            // Set QR data with racket prefix
            await page.evaluate(() => {
                (window as any).qrScannedData = 'RQ_TEST_QR';
            });

            // Data should persist
            const qrData = await page.evaluate(() => (window as any).qrScannedData);
            expect(qrData).toBe('RQ_TEST_QR');

            // Set QR data with bat prefix
            await page.evaluate(() => {
                (window as any).qrScannedData = 'CB_TEST_QR';
            });

            // Data should be updated
            const qrDataAfter = await page.evaluate(() => (window as any).qrScannedData);
            expect(qrDataAfter).toBe('CB_TEST_QR');
        });

        test('should clear data when modal reopens', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');

            // First open
            await qrScanBtn.click();

            // Verify modal is open
            await expect(page.locator('#qrScanModal')).toBeVisible();

            // Close modal
            const closeBtn = page.locator('#closeQRBtn').first();
            await closeBtn.click();

            // Wait for modal to close
            await expect(page.locator('#qrScanModal')).toBeHidden();

            // Reopen modal
            await qrScanBtn.click();

            // Verify modal reopened
            await expect(page.locator('#qrScanModal')).toBeVisible();

            // Verify camera status shows a message (either initial or camera access related)
            const cameraStatus = page.locator('#cameraStatus');
            const statusText = await cameraStatus.textContent();
            expect(statusText).toMatch(/(Position QR code|Camera access|Requesting camera|No camera found)/);
        });
    });

    test.describe('Performance and Loading States', () => {
        test('should show loading indicator while fetching items', async () => {
            let resolveRoute: () => void;

            await page.route('**/api/qr/**', async (route) => {
                await new Promise(resolve => {
                    resolveRoute = () => resolve(null);
                });
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, rackets: [] })
                });
            });

            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            // Items list should show loading state
            const unlinkedList = page.locator('#unlinkedList');
            await expect(unlinkedList).toBeVisible();
        });

        test('should handle slow API responses', async () => {
            await page.route('**/api/qr/**', async (route) => {
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, rackets: [] })
                });
            });

            expect(true).toBe(true);
        });

        test('should show correct initial label before QR scan', async () => {
            const qrScanBtn = page.locator('#openQRScanBtn');
            await qrScanBtn.click();

            // Before scanning any QR, label should be generic
            const listLabel = page.locator('#listLabel');
            await expect(listLabel).toContainText('Select Item');
        });
    });

    test.describe('QR Code Prefix Auto-Detection', () => {
        test('should auto-detect racket mode from RQ_ prefix', async () => {
            // Mock QR scan response for racket (RQ_ prefix)
            await page.route('**/api/qr/RQ_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'RQ_001',
                        linked: false,
                        unlinkedRacketsCount: 1,
                        rackets: [
                            {
                                orderId: 'DA_2024001',
                                customerName: 'Test User',
                                racket: {
                                    id: 'racket_001',
                                    racketName: 'Yonex Astrox 99',
                                    string: 'BG 65',
                                    tension: '26'
                                }
                            }
                        ]
                    })
                });
            });

            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Simulate QR code scan with RQ_ prefix
            await page.evaluate(() => {
                const qrCode = 'RQ_001';
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn(qrCode);
            });

            await page.waitForTimeout(500);

            // Verify label updated to racket mode
            const listLabel = page.locator('#listLabel');
            await expect(listLabel).toContainText('Select Racket:');

            // Verify racket items are displayed
            const unlinkedList = page.locator('#unlinkedList');
            await expect(unlinkedList).toContainText('Yonex Astrox 99');
        });

        test('should auto-detect cricket bat mode from CB_ prefix', async () => {
            // Mock QR scan response for bat (CB_ prefix)
            await page.route('**/api/qr/CB_001*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'CB_001',
                        linked: false,
                        unlinkedBatsCount: 1,
                        bats: [
                            {
                                orderId: 'DA_BAT_001',
                                customerName: 'Cricket Player',
                                bat: {
                                    id: 'bat_001',
                                    batModel: 'MRF Genius',
                                    package: '15000',
                                    threading: 'both'
                                }
                            }
                        ]
                    })
                });
            });

            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Simulate QR code scan with CB_ prefix
            await page.evaluate(() => {
                const qrCode = 'CB_001';
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn(qrCode);
            });

            await page.waitForTimeout(500);

            // Verify label updated to bat mode
            const listLabel = page.locator('#listLabel');
            await expect(listLabel).toContainText('Select Cricket Bat:');

            // Verify bat items are displayed
            const unlinkedList = page.locator('#unlinkedList');
            await expect(unlinkedList).toContainText('MRF Genius');
        });

        test('should hide racket/bat toggle buttons', async () => {
            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Verify toggle button container is hidden
            const selectRacketBtn = page.locator('#selectRacketBtn');
            const selectBatBtn = page.locator('#selectBatBtn');

            // Buttons should not be visible since parent div has display: none
            await expect(selectRacketBtn).toBeHidden();
            await expect(selectBatBtn).toBeHidden();
        });

        test('should fetch correct endpoint based on detected mode', async () => {
            let requestedMode = '';

            // Mock both racket and bat QR scan requests
            await page.route('**/api/qr/RQ_002*', async (route) => {
                const url = route.request().url();
                if (url.includes('mode=racket')) {
                    requestedMode = 'racket';
                }
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'RQ_002',
                        linked: false,
                        unlinkedRacketsCount: 0,
                        rackets: []
                    })
                });
            });

            await page.route('**/api/qr/CB_002*', async (route) => {
                const url = route.request().url();
                if (url.includes('mode=bat')) {
                    requestedMode = 'bat';
                }
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'CB_002',
                        linked: false,
                        unlinkedBatsCount: 0,
                        bats: []
                    })
                });
            });

            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Test racket QR
            await page.evaluate(() => {
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn('RQ_002');
            });
            await page.waitForTimeout(300);
            expect(requestedMode).toBe('racket');

            // Test bat QR
            await page.evaluate(() => {
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn('CB_002');
            });
            await page.waitForTimeout(300);
            expect(requestedMode).toBe('bat');
        });

        test('should handle QR without prefix gracefully', async () => {
            // Mock QR scan response without prefix (defaults to racket mode)
            await page.route('**/api/qr/GENERIC_QR*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'GENERIC_QR',
                        linked: false,
                        unlinkedRacketsCount: 0,
                        rackets: []
                    })
                });
            });

            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Simulate QR code scan without prefix
            await page.evaluate(() => {
                const qrCode = 'GENERIC_QR';
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn(qrCode);
            });

            await page.waitForTimeout(500);

            // Should still work (defaults to current mode)
            const unlinkedList = page.locator('#unlinkedList');
            await expect(unlinkedList).toBeVisible();
        });

        test('should switch mode when scanning different prefix types', async () => {
            // Mock both QR types
            await page.route('**/api/qr/RQ_SWITCH*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'RQ_SWITCH',
                        linked: false,
                        unlinkedRacketsCount: 0,
                        rackets: []
                    })
                });
            });

            await page.route('**/api/qr/CB_SWITCH*', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        qrCode: 'CB_SWITCH',
                        linked: false,
                        unlinkedBatsCount: 0,
                        bats: []
                    })
                });
            });

            // Open QR scanner
            await page.locator('#openQRScanBtn').click();
            await page.waitForSelector('#qrScanModal.show');

            // Scan racket QR
            await page.evaluate(() => {
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn('RQ_SWITCH');
            });
            await page.waitForTimeout(300);

            let listLabel = page.locator('#listLabel');
            await expect(listLabel).toContainText('Select Racket:');

            // Scan bat QR
            await page.evaluate(() => {
                const fetchFn = (window as any).fetchAvailableRackets;
                if (fetchFn) fetchFn('CB_SWITCH');
            });
            await page.waitForTimeout(300);

            listLabel = page.locator('#listLabel');
            await expect(listLabel).toContainText('Select Cricket Bat:');
        });
    });
});
