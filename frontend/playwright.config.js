const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './browser-tests', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:3012', trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:3012', reuseExistingServer: false, timeout: 180000,
    env: { PORT: '3012', BROWSER: 'none', HOST: '127.0.0.1', REACT_APP_SUPABASE_URL: 'https://datpack-audit.invalid', REACT_APP_SUPABASE_ANON_KEY: 'sb_publishable_audit_only' } },
});