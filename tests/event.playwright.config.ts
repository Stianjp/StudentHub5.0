import path from "node:path";
import { defineConfig } from "@playwright/test";
process.env.EVENT_MANAGEMENT_E2E = "1";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "event-management.spec.ts",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3013", trace: "retain-on-failure" },
  webServer: {
    command: "node tests/support/event-management-server.mjs",
    cwd: path.resolve(__dirname, ".."),
    url: "http://localhost:3013/event-register/test-event",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
