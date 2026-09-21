import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  reporter: "list",
  use: { browserName: "chromium", screenshot: "only-on-failure" },
});
