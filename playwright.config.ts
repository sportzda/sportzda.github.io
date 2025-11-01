import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 60000,
    expect: { timeout: 10000 },
    retries: 1,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        trace: 'retain-on-failure',
        video: 'retain-on-failure'
    },
    webServer: {
        command: 'NODE_NO_WARNINGS=1 npx http-server -p 5173 -c-1 .',
        port: 5173,
        reuseExistingServer: !process.env.CI
    }
});
