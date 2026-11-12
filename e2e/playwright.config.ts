import { defineConfig } from "@playwright/test";

const apiPort = 8787;
const webPort = 5173;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter @escapeai/api exec tsx src/index.ts",
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: String(apiPort),
        UPSTASH_REDIS_REST_URL: "",
        KV_REST_API_URL: "",
      },
    },
    {
      command: `pnpm --filter @escapeai/web exec vite --port ${webPort} --host 127.0.0.1`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
