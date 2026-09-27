import path from "node:path";
import { defineConfig } from "@playwright/test";

process.env.STUDENT_PORTAL_E2E = "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "student-portal.spec.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://student.localhost:3012", trace: "retain-on-failure" },
  webServer: {
    command: "node tests/support/student-portal-server.mjs",
    cwd: path.resolve(__dirname, ".."),
    url: "http://localhost:3012/auth/sign-in?role=student",
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
