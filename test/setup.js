// Mock window.alert
global.alert = jest.fn();

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ success: true })
    })
);