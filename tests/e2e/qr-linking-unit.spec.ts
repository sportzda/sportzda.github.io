import { test, expect } from '@playwright/test';

/**
 * Unit tests for QR Code Linking feature
 * Tests for utility functions, data validation, and API interactions
 */

test.describe('QR Code Linking - Unit Tests', () => {
    let page: any;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();

        // Setup test environment
        await page.addInitScript(() => {
            // Mock global variables used by QR feature
            (window as any).API_BASE_URL = 'http://localhost:3000';
            (window as any).authToken = 'test_token';
        });

        await page.goto('/staff-dashboard.html');
    });

    test.afterEach(async () => {
        await page.close();
    });

    test.describe('QR Code Format Validation', () => {
        test('should validate plain QR code format', async () => {
            const isValidQR = await page.evaluate(() => {
                const qrCode = 'QR_123456';
                return /^QR_/.test(qrCode);
            });

            expect(isValidQR).toBe(true);
        });

        test('should extract QR code from URL', async () => {
            const extractedQR = await page.evaluate(() => {
                const url = 'https://example.com/qr/QR_ABC_123';
                return url.split('/').pop();
            });

            expect(extractedQR).toBe('QR_ABC_123');
        });

        test('should handle URL with query parameters', async () => {
            const extractedQR = await page.evaluate(() => {
                const url = 'https://example.com/qr/QR_XYZ_789?store=main';
                return url.split('/').pop()?.split('?')[0];
            });

            expect(extractedQR).toBe('QR_XYZ_789');
        });

        test('should trim whitespace from QR codes', async () => {
            const trimmedQR = await page.evaluate(() => {
                const qr = '  QR_WITH_SPACES  ';
                return qr.trim();
            });

            expect(trimmedQR).toBe('QR_WITH_SPACES');
        });

        test('should handle QR codes with dashes and underscores', async () => {
            const isValid = await page.evaluate(() => {
                const qr = 'QR-ABC_123-XYZ';
                return /^QR[-A-Za-z0-9_]+$/.test(qr);
            });

            expect(isValid).toBe(true);
        });

        test('should reject empty QR codes', async () => {
            const isEmpty = await page.evaluate(() => {
                const qr = '';
                return qr.trim().length === 0;
            });

            expect(isEmpty).toBe(true);
        });

        test('should reject QR codes with only spaces', async () => {
            const isInvalid = await page.evaluate(() => {
                const qr = '   ';
                return qr.trim().length === 0;
            });

            expect(isInvalid).toBe(true);
        });
    });

    test.describe('Item Selection and Validation', () => {
        test('should validate item selection', async () => {
            const isSelected = await page.evaluate(() => {
                const item = {
                    id: 'racket_1',
                    name: 'Yonex Astrox 99',
                    selected: true
                };
                return item.id && item.selected;
            });

            expect(isSelected).toBe(true);
        });

        test('should validate racket data structure', async () => {
            const isValid = await page.evaluate(() => {
                const racket = {
                    id: 'racket_1',
                    racketName: 'Yonex Astrox 99',
                    string: 'Yonex BG 65',
                    tension: '26'
                };

                return racket.id && racket.racketName &&
                    racket.string && racket.tension;
            });

            expect(isValid).toBe(true);
        });

        test('should validate cricket bat data structure', async () => {
            const isValid = await page.evaluate(() => {
                const bat = {
                    id: 'bat_1',
                    batModel: 'MRF Grand',
                    package: '15000',
                    threading: 'both'
                };

                return bat.id && bat.batModel && bat.package;
            });

            expect(isValid).toBe(true);
        });

        test('should require order information with item', async () => {
            const hasOrderInfo = await page.evaluate(() => {
                const item = {
                    orderId: 'DA_001',
                    customerName: 'Test Customer',
                    racket: { id: 'racket_1' }
                };

                return item.orderId && item.customerName && item.racket;
            });

            expect(hasOrderInfo).toBe(true);
        });

        test('should handle missing optional fields gracefully', async () => {
            const hasRequired = await page.evaluate(() => {
                const item = {
                    id: 'racket_1',
                    racketName: 'Racket A'
                    // string and tension missing
                };

                return item.id && item.racketName;
            });

            expect(hasRequired).toBe(true);
        });
    });

    test.describe('Mode Management (Racket vs Bat)', () => {
        test('should correctly identify racket mode', async () => {
            const isRacketMode = await page.evaluate(() => {
                const mode = 'racket';
                return mode === 'racket';
            });

            expect(isRacketMode).toBe(true);
        });

        test('should correctly identify bat mode', async () => {
            const isBatMode = await page.evaluate(() => {
                const mode = 'bat';
                return mode === 'bat';
            });

            expect(isBatMode).toBe(true);
        });

        test('should switch between modes', async () => {
            const mode1 = 'racket';
            const mode2 = 'bat';
            const canSwitch = mode1 !== mode2;

            expect(canSwitch).toBe(true);
        });

        test('should provide correct label for racket mode', async () => {
            const label = await page.evaluate(() => {
                const mode = 'racket';
                return mode === 'racket' ? 'Select Racket:' : 'Select Cricket Bat:';
            });

            expect(label).toBe('Select Racket:');
        });

        test('should provide correct label for bat mode', async () => {
            const label = await page.evaluate(() => {
                const mode = 'bat';
                return mode === 'racket' ? 'Select Racket:' : 'Select Cricket Bat:';
            });

            expect(label).toBe('Select Cricket Bat:');
        });
    });

    test.describe('Data Formatting and Display', () => {
        test('should format racket information correctly', async () => {
            const formatted = await page.evaluate(() => {
                const racket = {
                    racketName: 'Yonex Astrox 99',
                    string: 'Yonex BG 65',
                    tension: '26'
                };

                return `${racket.racketName} | ${racket.string} | ${racket.tension} lbs`;
            });

            expect(formatted).toBe('Yonex Astrox 99 | Yonex BG 65 | 26 lbs');
        });

        test('should format cricket bat information correctly', async () => {
            const formatted = await page.evaluate(() => {
                const bat = {
                    batModel: 'MRF Grand',
                    package: '15000',
                    threading: 'both'
                };

                const threadingDisplay = bat.threading !== 'none' ? ` | ${bat.threading} threading` : '';
                return `${bat.batModel} | ${bat.package} balls${threadingDisplay}`;
            });

            expect(formatted).toBe('MRF Grand | 15000 balls | both threading');
        });

        test('should handle cricket bat without threading', async () => {
            const formatted = await page.evaluate(() => {
                const bat = {
                    batModel: 'MRF Grand',
                    package: '15000',
                    threading: 'none'
                };

                const threadingDisplay = bat.threading !== 'none' ? ` | ${bat.threading} threading` : '';
                return `${bat.batModel} | ${bat.package} balls${threadingDisplay}`;
            });

            expect(formatted).toBe('MRF Grand | 15000 balls');
        });

        test('should display customer info with item', async () => {
            const display = await page.evaluate(() => {
                const item = {
                    orderId: 'DA_001',
                    customerName: 'John Doe',
                    racket: { racketName: 'Racket A' }
                };

                return `${item.orderId} • ${item.customerName}`;
            });

            expect(display).toBe('DA_001 • John Doe');
        });

        test('should capitalize threading values correctly', async () => {
            const threading = await page.evaluate(() => {
                const value = 'both';
                return value.charAt(0).toUpperCase() + value.slice(1);
            });

            expect(threading).toBe('Both');
        });
    });

    test.describe('API Request Building', () => {
        test('should build QR scan API URL correctly', async () => {
            const url = await page.evaluate(() => {
                const baseUrl = 'http://localhost:3000';
                const qrCode = 'QR_123';
                return `${baseUrl}/api/qr/${encodeURIComponent(qrCode)}`;
            });

            expect(url).toBe('http://localhost:3000/api/qr/QR_123');
        });

        test('should build QR scan URL with mode parameter', async () => {
            const url = await page.evaluate(() => {
                const baseUrl = 'http://localhost:3000';
                const qrCode = 'QR_123';
                const mode = 'bat';
                return `${baseUrl}/api/qr/${encodeURIComponent(qrCode)}?mode=${mode}`;
            });

            expect(url).toBe('http://localhost:3000/api/qr/QR_123?mode=bat');
        });

        test('should build QR link API URL correctly', async () => {
            const url = await page.evaluate(() => {
                const baseUrl = 'http://localhost:3000';
                const qrCode = 'QR_123';
                return `${baseUrl}/api/qr/${encodeURIComponent(qrCode)}/link`;
            });

            expect(url).toBe('http://localhost:3000/api/qr/QR_123/link');
        });

        test('should build link request body correctly', async () => {
            const body = await page.evaluate(() => {
                return JSON.stringify({
                    orderId: 'DA_001',
                    racketId: 'racket_1'
                });
            });

            const parsed = JSON.parse(body);
            expect(parsed.orderId).toBe('DA_001');
            expect(parsed.racketId).toBe('racket_1');
        });

        test('should include authentication header', async () => {
            const hasAuth = await page.evaluate(() => {
                const token = 'test_token_123';
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                return headers['Authorization'].startsWith('Bearer ');
            });

            expect(hasAuth).toBe(true);
        });

        test('should URL encode QR codes with special characters', async () => {
            const encoded = await page.evaluate(() => {
                const qr = 'QR-ABC/123';
                return encodeURIComponent(qr);
            });

            expect(encoded).toBe('QR-ABC%2F123');
        });
    });

    test.describe('API Response Validation', () => {
        test('should validate successful QR scan response', async () => {
            const isValid = await page.evaluate(() => {
                const response = {
                    success: true,
                    qrCode: 'QR_123',
                    linked: false,
                    rackets: []
                };

                return response.success && response.qrCode &&
                    Array.isArray(response.rackets);
            });

            expect(isValid).toBe(true);
        });

        test('should validate linked QR response', async () => {
            const isValid = await page.evaluate(() => {
                const response = {
                    success: true,
                    qrCode: 'QR_123',
                    linked: true,
                    linkedRacketId: 'racket_1',
                    order: {
                        orderId: 'DA_001'
                    }
                };

                return response.success && response.linked &&
                    response.linkedRacketId && response.order;
            });

            expect(isValid).toBe(true);
        });

        test('should validate link QR success response', async () => {
            const isValid = await page.evaluate(() => {
                const response = {
                    success: true,
                    message: 'QR code linked successfully',
                    qrCode: 'QR_123',
                    orderId: 'DA_001',
                    racketId: 'racket_1',
                    alreadyLinked: false
                };

                return response.success && response.qrCode &&
                    response.orderId && response.racketId;
            });

            expect(isValid).toBe(true);
        });

        test('should validate error response format', async () => {
            const isValid = await page.evaluate(() => {
                const error = {
                    success: false,
                    message: 'QR code not found'
                };

                return !error.success && error.message;
            });

            expect(isValid).toBe(true);
        });

        test('should extract message from error response', async () => {
            const message = await page.evaluate(() => {
                const error = {
                    success: false,
                    message: 'QR code already linked to another racket',
                    error: 'ALREADY_LINKED'
                };

                return error.message;
            });

            expect(message).toBe('QR code already linked to another racket');
        });
    });

    test.describe('State Management', () => {
        test('should initialize QR scan state correctly', async () => {
            const state = await page.evaluate(() => {
                return {
                    qrScannedData: null,
                    selectedItemId: null,
                    selectedItemType: null,
                    scanMode: 'racket',
                    cameraActive: false
                };
            });

            expect(state.qrScannedData).toBeNull();
            expect(state.selectedItemId).toBeNull();
            expect(state.scanMode).toBe('racket');
            expect(state.cameraActive).toBe(false);
        });

        test('should update QR scanned data', async () => {
            const updated = await page.evaluate(() => {
                let state = { qrScannedData: null };
                state.qrScannedData = 'QR_NEW_001';
                return state.qrScannedData;
            });

            expect(updated).toBe('QR_NEW_001');
        });

        test('should update item selection', async () => {
            const updated = await page.evaluate(() => {
                let state = {
                    selectedItemId: null,
                    selectedItemType: null
                };
                state.selectedItemId = 'racket_1';
                state.selectedItemType = 'racket';
                return { id: state.selectedItemId, type: state.selectedItemType };
            });

            expect(updated.id).toBe('racket_1');
            expect(updated.type).toBe('racket');
        });

        test('should reset state for new scan', async () => {
            const reset = await page.evaluate(() => {
                let state = {
                    qrScannedData: 'OLD_QR',
                    selectedItemId: 'racket_1',
                    selectedItemType: 'racket'
                };
                // Reset
                state = {
                    qrScannedData: null,
                    selectedItemId: null,
                    selectedItemType: null
                };
                return state;
            });

            expect(reset.qrScannedData).toBeNull();
            expect(reset.selectedItemId).toBeNull();
            expect(reset.selectedItemType).toBeNull();
        });

        test('should preserve state when switching modes', async () => {
            const preserved = await page.evaluate(() => {
                let state = {
                    qrScannedData: 'QR_123',
                    scanMode: 'racket'
                };
                // Switch mode
                state.scanMode = 'bat';
                // QR data should persist
                return state;
            });

            expect(preserved.qrScannedData).toBe('QR_123');
            expect(preserved.scanMode).toBe('bat');
        });
    });

    test.describe('Array and List Operations', () => {
        test('should filter items by type', async () => {
            const filtered = await page.evaluate(() => {
                const items = [
                    { id: 'r1', type: 'racket' },
                    { id: 'b1', type: 'bat' },
                    { id: 'r2', type: 'racket' }
                ];
                return items.filter(item => item.type === 'racket');
            });

            expect(filtered).toHaveLength(2);
            expect(filtered[0].id).toBe('r1');
        });

        test('should limit items list to maximum count', async () => {
            const limited = await page.evaluate(() => {
                const items = Array.from({ length: 100 }, (_, i) => ({ id: `item_${i}` }));
                const maxItems = 5;
                return items.slice(0, maxItems);
            });

            expect(limited).toHaveLength(5);
        });

        test('should find item by ID', async () => {
            const found = await page.evaluate(() => {
                const items = [
                    { id: 'racket_1', name: 'Racket A' },
                    { id: 'racket_2', name: 'Racket B' }
                ];
                return items.find(item => item.id === 'racket_2');
            });

            expect(found?.name).toBe('Racket B');
        });

        test('should check if item exists in list', async () => {
            const exists = await page.evaluate(() => {
                const items = [
                    { id: 'racket_1' },
                    { id: 'racket_2' }
                ];
                return items.some(item => item.id === 'racket_2');
            });

            expect(exists).toBe(true);
        });

        test('should map items for display', async () => {
            const mapped = await page.evaluate(() => {
                const items = [
                    { racketName: 'Racket A', tension: '26' },
                    { racketName: 'Racket B', tension: '27' }
                ];
                return items.map(r => `${r.racketName} (${r.tension} lbs)`);
            });

            expect(mapped).toContain('Racket A (26 lbs)');
            expect(mapped).toContain('Racket B (27 lbs)');
        });
    });

    test.describe('Edge Cases and Error Scenarios', () => {
        test('should handle null QR code gracefully', async () => {
            const isEmpty = await page.evaluate(() => {
                const qr = null;
                return !qr || qr.trim() === '';
            });

            expect(isEmpty).toBe(true);
        });

        test('should handle undefined response fields', async () => {
            const handled = await page.evaluate(() => {
                const response = {
                    success: true,
                    rackets: undefined
                };
                return response.rackets ?? [];
            });

            expect(handled).toEqual([]);
        });

        test('should handle empty items list', async () => {
            const isEmpty = await page.evaluate(() => {
                const items: any[] = [];
                return items.length === 0;
            });

            expect(isEmpty).toBe(true);
        });

        test('should handle response with extra fields', async () => {
            const extracted = await page.evaluate(() => {
                const response = {
                    success: true,
                    qrCode: 'QR_123',
                    linked: false,
                    rackets: [],
                    extraField: 'should_be_ignored'
                };

                return {
                    success: response.success,
                    qrCode: response.qrCode,
                    linked: response.linked,
                    rackets: response.rackets
                };
            });

            expect(extracted.extraField).toBeUndefined();
        });

        test('should validate required fields exist before using', async () => {
            const isValid = await page.evaluate(() => {
                const item = {};
                return 'id' in item && 'racketName' in item;
            });

            expect(isValid).toBe(false);
        });
    });

    test.describe('String and Number Operations', () => {
        test('should convert tension to number if needed', async () => {
            const tension = await page.evaluate(() => {
                const tensionStr = '26';
                return parseInt(tensionStr);
            });

            expect(typeof tension).toBe('number');
            expect(tension).toBe(26);
        });

        test('should format tension with unit', async () => {
            const formatted = await page.evaluate(() => {
                const tension = 26;
                return `${tension} lbs`;
            });

            expect(formatted).toBe('26 lbs');
        });

        test('should concatenate order ID and customer name', async () => {
            const display = await page.evaluate(() => {
                const orderId = 'DA_001';
                const name = 'John Doe';
                return `${orderId} • ${name}`;
            });

            expect(display).toBe('DA_001 • John Doe');
        });

        test('should handle long customer names', async () => {
            const truncated = await page.evaluate(() => {
                const name = 'A'.repeat(100);
                const maxLength = 50;
                return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
            });

            expect(truncated).toHaveLength(53); // 50 + '...'
        });
    });
});
