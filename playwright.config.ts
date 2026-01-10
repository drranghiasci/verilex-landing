import { defineConfig } from '@playwright/test';

const baseURL = process.env.INTAKE_BASE_URL || 'http://localhost:3000';
const webServerCommand = process.env.INTAKE_WEB_SERVER_COMMAND || 'npm run dev:intake';
const readinessUrl = `${baseURL.replace(/\/$/, '')}/api/intake/counties`;
const serverPort = (() => {
  try {
    const parsed = new URL(baseURL);
    return parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
  } catch {
    return '3000';
  }
})();

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
  },
  webServer: {
    command: webServerCommand,
    url: readinessUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: process.env.PORT || serverPort,
    },
  },
});
