/**
 * Unit tests for QR Code Status Filtering Logic
 * Tests the filter logic that shows only items with status 0 or undefined
 */

describe('QR Unlinked Items Status Filtering', () => {
    // Simulate the filter logic from staff-dashboard.html
    const filterByStatus = (items) => {
        return items.filter(item => {
            const itemData = item.racket || item.bat || item;
            const status = itemData.status;
            return status === undefined || status === null || status === 0;
        });
    };

    describe('Racket Status Filtering', () => {
        test('should include rackets with status 0', () => {
            const rackets = [
                { racket: { id: '1', racketName: 'Yonex', status: 0 } },
                { racket: { id: '2', racketName: 'Victor', status: 1 } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racket.id).toBe('1');
        });

        test('should include rackets with undefined status', () => {
            const rackets = [
                { racket: { id: '1', racketName: 'Yonex' } },
                { racket: { id: '2', racketName: 'Victor', status: 1 } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racket.id).toBe('1');
        });

        test('should include rackets with null status', () => {
            const rackets = [
                { racket: { id: '1', racketName: 'Yonex', status: null } },
                { racket: { id: '2', racketName: 'Victor', status: 2 } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racket.id).toBe('1');
        });

        test('should exclude rackets with status 1 (In Progress)', () => {
            const rackets = [
                { racket: { id: '1', racketName: 'Yonex', status: 1 } },
                { racket: { id: '2', racketName: 'Victor', status: 0 } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racket.id).toBe('2');
        });

        test('should exclude rackets with status 2 (Completed)', () => {
            const rackets = [
                { racket: { id: '1', racketName: 'Yonex', status: 2 } },
                { racket: { id: '2', racketName: 'Victor', status: 0 } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racket.id).toBe('2');
        });

        test('should handle multiple rackets with mixed statuses', () => {
            const rackets = [
                { racket: { id: '1', status: 0 } },
                { racket: { id: '2', status: 1 } },
                { racket: { id: '3', status: 2 } },
                { racket: { id: '4', status: 0 } },
                { racket: { id: '5' } }, // undefined
                { racket: { id: '6', status: null } }
            ];
            const filtered = filterByStatus(rackets);
            expect(filtered).toHaveLength(4);
            expect(filtered.map(r => r.racket.id)).toEqual(['1', '4', '5', '6']);
        });
    });

    describe('Cricket Bat Status Filtering', () => {
        test('should include bats with status 0', () => {
            const bats = [
                { bat: { id: '1', batModel: 'MRF', status: 0 } },
                { bat: { id: '2', batModel: 'SS', status: 1 } }
            ];
            const filtered = filterByStatus(bats);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].bat.id).toBe('1');
        });

        test('should include bats with undefined status', () => {
            const bats = [
                { bat: { id: '1', batModel: 'MRF' } },
                { bat: { id: '2', batModel: 'SS', status: 2 } }
            ];
            const filtered = filterByStatus(bats);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].bat.id).toBe('1');
        });

        test('should exclude bats with status 1 or 2', () => {
            const bats = [
                { bat: { id: '1', status: 0 } },
                { bat: { id: '2', status: 1 } },
                { bat: { id: '3', status: 2 } }
            ];
            const filtered = filterByStatus(bats);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].bat.id).toBe('1');
        });
    });

    describe('Edge Cases', () => {
        test('should return empty array when all items are filtered out', () => {
            const items = [
                { racket: { id: '1', status: 1 } },
                { racket: { id: '2', status: 2 } }
            ];
            const filtered = filterByStatus(items);
            expect(filtered).toHaveLength(0);
        });

        test('should handle empty array', () => {
            const filtered = filterByStatus([]);
            expect(filtered).toHaveLength(0);
        });

        test('should handle items without racket or bat wrapper', () => {
            const items = [
                { id: '1', status: 0 },
                { id: '2', status: 1 }
            ];
            const filtered = filterByStatus(items);
            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('1');
        });
    });
});
