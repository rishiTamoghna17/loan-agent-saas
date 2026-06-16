import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

process.env.PLAYWRIGHT_TEST = "true";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PLAYWRIGHT_TEST: "true",
          SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || "",
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        }
      }
});
