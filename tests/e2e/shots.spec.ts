import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Not a check: saves screenshots and a frame sequence of a full conversation for review.
 * Runs only with TALK_SHOTS_DIR set, e.g. TALK_SHOTS_DIR=/tmp/talk-shots npm run test:e2e -- shots
 */
const root = process.env.TALK_SHOTS_DIR;
test.skip(!root, "set TALK_SHOTS_DIR to save screenshots and frames");

async function enter(page: Page) {
  await page.goto("/");
  await expect(page.locator("#intro .cta")).toBeVisible();
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(page.locator("#intro")).toHaveClass(/gone/, { timeout: 2_000 });
  }).toPass({ timeout: 40_000 });
  await page.waitForFunction(() => document.body.classList.contains("talk-ready"), null, { timeout: 40_000 });
  await page.waitForTimeout(2_500);
}

/** Records compositor frames (Chromium screencast) into dir/frames while `run` plays. */
async function frames(page: Page, dir: string, run: () => Promise<void>) {
  mkdirSync(join(dir, "frames"), { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on("Page.screencastFrame", (f: { data: string; sessionId: number }) => {
    n++;
    writeFileSync(join(dir, "frames", `${String(n).padStart(4, "0")}.jpg`), Buffer.from(f.data, "base64"));
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 72, everyNthFrame: 1 });
  try {
    await run();
  } finally {
    await cdp.send("Page.stopScreencast").catch(() => {});
  }
  return n;
}

const chip = (page: Page, text: string) => page.locator("#talk .talk-choices .talk-chip", { hasText: text });
const answered = (page: Page) => expect(page.locator("#talk")).toHaveAttribute("data-state", "answered", { timeout: 120_000 });

test("full scripted conversation", async ({ page, isMobile }, info) => {
  test.setTimeout(600_000);
  const dir = join(root!, info.project.name);
  mkdirSync(dir, { recursive: true });
  const shot = (name: string) => page.screenshot({ path: join(dir, name) });

  await enter(page);
  await shot("01-scene-entry-button.png");
  await page.locator(".talk-fab").click();
  await expect(page.locator("#talk")).toBeVisible();
  await page.waitForTimeout(800);
  await shot("02-panel-open.png");

  const count = await frames(page, dir, async () => {
    await chip(page, "O que você faz no Nubank?").click();
    await page.waitForTimeout(3_500);
    await shot("03-camera-glide-and-talk.png");
    await answered(page);
    await page.waitForTimeout(600);
    await shot("04-nubank-answer.png");
    await chip(page, "Como funcionam os experimentos de limite?").click();
    await page.waitForTimeout(isMobile ? 2_500 : 4_500);
    await shot(isMobile ? "05-experiments-answer.png" : "05-dossier-card-open.png");
    await answered(page);
  });
  writeFileSync(join(dir, "frames", "README.txt"), `${count} frames, Chromium screencast, ${info.project.name}\n`);

  if (isMobile) {
    await page.locator('#talk .talk-did [data-did="card"]').last().click();
    await page.waitForTimeout(1_200);
    await shot("06-card-from-button.png");
  }
  // close the card and keep talking (Esc would close the panel first)
  await page.locator("#dossier-close").click();
  await expect(page.locator("#dossier")).not.toHaveClass(/\bopen\b/);
  await chip(page, "voltar ao início").click();
  await chip(page, "Quem é você?").click();
  await page.waitForTimeout(4_500);
  await shot("07-who-swivel-at-desk.png");
  await answered(page);
  await chip(page, "voltar ao início").click();
  await chip(page, "Como falo com você?").click();
  await page.waitForTimeout(5_000);
  await shot("08-contact.png");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion: highlight only", async ({ page }, info) => {
    const dir = join(root!, info.project.name);
    mkdirSync(dir, { recursive: true });
    await enter(page);
    await page.locator(".talk-fab").click();
    await chip(page, "O que você faz no Nubank?").click();
    await answered(page);
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: join(dir, "09-reduced-motion-no-travel.png") });
  });
});
