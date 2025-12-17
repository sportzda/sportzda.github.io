/**
 * Unit tests for Pending Payments Tab
 * Tests that only completed orders (status 2) with unpaid/partial payment are shown
 */

describe('Pending Payments Tab', () => {
    // Simulate the filter logic from staff-dashboard.html
    const filterCompletedOrdersWithPendingPayment = (orders, service) => {
        const filtered = [];

        for (const order of orders) {
            // Skip if payment is already completed
            if (order.paymentStatus === 'paid' || order.paymentStatus === 'Paid') {
                continue;
            }

            if (service === 'racket-stringing' && order.racketDetails) {
                // Filter rackets with status 2 (completed)
                const completedRackets = order.racketDetails.filter(r => {
                    const itemStatus = r.status !== undefined && r.status !== null ? Number(r.status) : 0;
                    return itemStatus === 2;
                });

                if (completedRackets.length > 0) {
                    filtered.push({
                        ...order,
                        racketDetails: completedRackets
                    });
                }
            } else if (service === 'bat-knocking' && order.batDetails) {
                // Filter bats with status 2 (completed)
                const completedBats = order.batDetails.filter(b => {
                    const itemStatus = b.status !== undefined && b.status !== null ? Number(b.status) : 0;
                    return itemStatus === 2;
                });

                if (completedBats.length > 0) {
                    filtered.push({
                        ...order,
                        batDetails: completedBats
                    });
                }
            }
        }

        return filtered;
    };

    describe('Racket Stringing - Completed Orders with Pending Payment', () => {
        test('should include completed rackets (status 2) with unpaid payment', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [
                        { id: '1', racketName: 'Yonex', status: 2 },
                        { id: '2', racketName: 'Victor', status: 1 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(1);
            expect(filtered[0].racketDetails[0].status).toBe(2);
        });

        test('should exclude orders with paid status', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'paid',
                    racketDetails: [{ id: '1', status: 2 }]
                },
                {
                    orderId: 'ORD002',
                    paymentStatus: 'Paid',
                    racketDetails: [{ id: '2', status: 2 }]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(0);
        });

        test('should exclude rackets with status 0 (not started)', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [
                        { id: '1', status: 0 },
                        { id: '2', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(1);
            expect(filtered[0].racketDetails[0].id).toBe('2');
        });

        test('should exclude rackets with status 1 (in progress)', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'unpaid',
                    racketDetails: [
                        { id: '1', status: 1 },
                        { id: '2', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(1);
            expect(filtered[0].racketDetails[0].id).toBe('2');
        });

        test('should include multiple completed rackets from same order', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'partial',
                    racketDetails: [
                        { id: '1', status: 2 },
                        { id: '2', status: 2 },
                        { id: '3', status: 1 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(2);
        });

        test('should handle orders without racketDetails', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending'
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(0);
        });

        test('should handle rackets with undefined status (defaults to 0)', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [
                        { id: '1', racketName: 'Yonex' }, // undefined status
                        { id: '2', racketName: 'Victor', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(1);
            expect(filtered[0].racketDetails[0].id).toBe('2');
        });
    });

    describe('Bat Knocking - Completed Orders with Pending Payment', () => {
        test('should include completed bats (status 2) with unpaid payment', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    batDetails: [
                        { id: '1', batModel: 'MRF', status: 2 },
                        { id: '2', batModel: 'SS', status: 0 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'bat-knocking');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].batDetails).toHaveLength(1);
            expect(filtered[0].batDetails[0].status).toBe(2);
        });

        test('should exclude bats with status 0 or 1', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'unpaid',
                    batDetails: [
                        { id: '1', status: 0 },
                        { id: '2', status: 1 },
                        { id: '3', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'bat-knocking');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].batDetails).toHaveLength(1);
            expect(filtered[0].batDetails[0].id).toBe('3');
        });

        test('should exclude paid bat orders', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'paid',
                    batDetails: [{ id: '1', status: 2 }]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'bat-knocking');
            expect(filtered).toHaveLength(0);
        });

        test('should handle multiple completed bats', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'partial',
                    batDetails: [
                        { id: '1', status: 2 },
                        { id: '2', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'bat-knocking');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].batDetails).toHaveLength(2);
        });
    });

    describe('Mixed Status Scenarios', () => {
        test('should filter multiple orders correctly', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [{ id: '1', status: 2 }]
                },
                {
                    orderId: 'ORD002',
                    paymentStatus: 'paid',
                    racketDetails: [{ id: '2', status: 2 }]
                },
                {
                    orderId: 'ORD003',
                    paymentStatus: 'unpaid',
                    racketDetails: [{ id: '3', status: 1 }]
                },
                {
                    orderId: 'ORD004',
                    paymentStatus: 'partial',
                    racketDetails: [{ id: '4', status: 2 }]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(2);
            expect(filtered.map(o => o.orderId)).toEqual(['ORD001', 'ORD004']);
        });

        test('should handle orders with all items not completed', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [
                        { id: '1', status: 0 },
                        { id: '2', status: 1 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(0);
        });

        test('should handle partial completion within an order', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'pending',
                    racketDetails: [
                        { id: '1', status: 0 },
                        { id: '2', status: 1 },
                        { id: '3', status: 2 },
                        { id: '4', status: 2 }
                    ]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(2);
            expect(filtered[0].racketDetails.every(r => r.status === 2)).toBe(true);
        });
    });

    describe('Payment Status Validation', () => {
        test('should accept various unpaid payment statuses', () => {
            const paymentStatuses = ['pending', 'unpaid', 'partial', 'Pay At Outlet', ''];
            
            paymentStatuses.forEach(status => {
                const orders = [{
                    orderId: 'ORD001',
                    paymentStatus: status,
                    racketDetails: [{ id: '1', status: 2 }]
                }];
                const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
                expect(filtered.length).toBeGreaterThan(0);
            });
        });

        test('should reject paid and Paid statuses (case-sensitive)', () => {
            const orders = [
                {
                    orderId: 'ORD001',
                    paymentStatus: 'paid',
                    racketDetails: [{ id: '1', status: 2 }]
                },
                {
                    orderId: 'ORD002',
                    paymentStatus: 'Paid',
                    racketDetails: [{ id: '2', status: 2 }]
                }
            ];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(0);
        });

        test('should handle missing paymentStatus field', () => {
            const orders = [{
                orderId: 'ORD001',
                racketDetails: [{ id: '1', status: 2 }]
            }];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
        });
    });

    describe('Edge Cases', () => {
        test('should return empty array for empty input', () => {
            const filtered = filterCompletedOrdersWithPendingPayment([], 'racket-stringing');
            expect(filtered).toHaveLength(0);
        });

        test('should handle null status values', () => {
            const orders = [{
                orderId: 'ORD001',
                paymentStatus: 'pending',
                racketDetails: [
                    { id: '1', status: null },
                    { id: '2', status: 2 }
                ]
            }];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].racketDetails).toHaveLength(1);
            expect(filtered[0].racketDetails[0].id).toBe('2');
        });

        test('should handle string status values', () => {
            const orders = [{
                orderId: 'ORD001',
                paymentStatus: 'pending',
                racketDetails: [{ id: '1', status: '2' }]
            }];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered).toHaveLength(1);
            expect(Number(filtered[0].racketDetails[0].status)).toBe(2);
        });

        test('should preserve order structure and metadata', () => {
            const orders = [{
                orderId: 'ORD001',
                customerName: 'John Doe',
                phone: '1234567890',
                paymentStatus: 'pending',
                createdAt: '2025-12-17',
                racketDetails: [{ id: '1', status: 2, racketName: 'Yonex' }]
            }];
            const filtered = filterCompletedOrdersWithPendingPayment(orders, 'racket-stringing');
            expect(filtered[0].orderId).toBe('ORD001');
            expect(filtered[0].customerName).toBe('John Doe');
            expect(filtered[0].phone).toBe('1234567890');
            expect(filtered[0].createdAt).toBe('2025-12-17');
        });
    });
});
