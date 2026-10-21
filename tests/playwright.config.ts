import { defineConfig } from "@playwright/test";

const port = Number(process.env.TALK_E2E_PORT ?? 4391);

/**
 * e2e for "Fale com o Davi" against `vite preview` of a fresh production build.
 * channel "chromium" runs the full Chromium in new headless mode, which renders WebGL on the GPU;
 * the default headless shell falls back to software rendering (about 2 fps for this scene).
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "../node_modules/.cache/talk-e2e",
  timeout: 150_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, locale: "pt-BR" },
  webServer: {
    command: `npm run build && npx vite preview --host localhost --port ${port} --strictPort`,
    cwd: "..",
    url: `http://localhost:${port}`,
    timeout: 180_000,
    reuseExistingServer: !!process.env.TALK_E2E_REUSE,
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", channel: "chromium", viewport: { width: 1456, height: 830 } } },
    { name: "mobile", use: { browserName: "chromium", channel: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
});
