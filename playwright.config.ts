import { defineConfig } from '@playwright/test'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  端口: 通过 TEST_PORT 环境变量统一控制
//  运行: TEST_PORT=5178 npx playwright test
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const port = process.env.TEST_PORT ?? '5173'

export default defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx vite --port ${port}`,
    port: Number(port),
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
