import { expect, test, type Page } from "@playwright/test";
import { entryOf } from "../../src/talk/qa";

const NOTE_PT = "Respostas prontas, escritas a partir do currículo do Davi.";
const NOTE_EN = "Ready-made answers based on Davi's résumé.";
const panelChunk = (url: string) => /\/assets\/panel-[\w-]+\.js$/.test(url);
/** The tour's counter announces "NN de 06". */
const chapter = (page: Page, n: number) => expect(page.locator("#counter")).toHaveAttribute("aria-label", `${String(n).padStart(2, "0")} de 06`);

const problems = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  problems.set(page, list);
  page.on("console", (m) => {
    if (m.type() === "error") list.push(m.text());
  });
  page.on("pageerror", (e) => list.push(e.message));
});

test.afterEach(async ({ page }) => {
  expect(problems.get(page), "console errors").toEqual([]);
});

/** Loads the site and walks in, like a visitor pressing Enter on the intro. */
async function enter(page: Page) {
  await page.goto("/");
  await expect(page.locator("#intro .cta")).toBeVisible();
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(page.locator("#intro")).toHaveClass(/gone/, { timeout: 2_000 });
  }).toPass({ timeout: 40_000 });
  await page.waitForFunction(() => document.body.classList.contains("talk-ready"), null, { timeout: 40_000 });
  await chapter(page, 1);
  // Let the intro camera glide finish.
  await page.waitForTimeout(2_500);
}

/** A finger drag over the 3D, like a phone swipe (Chromium touch events). */
async function swipe(page: Page, x: number, y0: number, y1: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function openPanel(page: Page) {
  await page.locator(".talk-fab").click();
  const dialog = page.getByRole("dialog", { name: "Fale com o Davi" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function ask(page: Page, question: string) {
  await page.locator("#talk .talk-choices .talk-chip", { hasText: question }).click();
}

async function skip(page: Page) {
  const button = page.locator("#talk .talk-chip[data-skip]");
  if (await button.isVisible()) await button.click();
  await expect(page.locator("#talk")).toHaveAttribute("data-state", "answered");
}

const focusInside = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return !!a && (!!document.getElementById("talk")?.contains(a) || !!document.getElementById("dossier-sheet")?.contains(a));
  });

test("entry points open the panel, loaded lazily, labelled as ready-made answers", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  await enter(page);

  const fab = page.locator(".talk-fab");
  await expect(fab).toBeVisible();
  await expect(fab).toContainText("Fale com o Davi");
  await expect(fab).not.toContainText(/\b(IA|AI)\b/);
  await expect(page.locator("#bar .talk-hud")).toBeVisible();
  expect(requested.some(panelChunk), "panel chunk before the first open").toBe(false);

  await page.keyboard.press("t");
  const dialog = page.getByRole("dialog", { name: "Fale com o Davi" });
  await expect(dialog).toBeVisible();
  expect(requested.some(panelChunk), "panel chunk after the first open").toBe(true);
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.locator(".talk-note")).toHaveText(NOTE_PT);
  await expect(dialog.locator('[aria-live="polite"]')).toHaveCount(1);
  await expect(dialog.locator(".talk-choices .talk-chip")).toHaveCount(4);
  await expect(dialog.locator("input, textarea")).toHaveCount(0);
  await expect(dialog).not.toContainText(/\((IA|AI)\)/);

  await dialog.locator(".talk-close").click();
  await expect(dialog).toBeHidden();
  await page.locator("#bar .talk-hud").click();
  await expect(dialog).toBeVisible();
});

test("a question chip answers with typing, subtitles, a talking avatar and a camera glide", async ({ page }) => {
  await enter(page);
  const dialog = await openPanel(page);
  await ask(page, "O que você faz no Nubank?");

  const typed = dialog.locator(".talk-turn").last().locator(".talk-typed");
  await expect(typed).not.toBeEmpty();
  const early = (await typed.textContent())!.length;
  await expect.poll(async () => (await typed.textContent())!.length).toBeGreaterThan(early);
  await expect(page.locator(".talk-subs")).toHaveClass(/\bon\b/);
  await expect(page.locator(".talk-subs-line")).not.toBeEmpty();
  await expect(dialog).toHaveAttribute("data-avatar", "talking");

  await chapter(page, 2);
  await expect(page.locator('#rail [data-rail="war"]')).toHaveClass(/\bon\b/);
  await expect(dialog).toHaveAttribute("data-focus", "nubank");
  // the tour's own focus shot frames the board next to the panel
  await expect(page.locator("#stage")).toHaveClass(/\bfocus\b/);

  const full = entryOf("nubank")!.a.pt;
  await expect(dialog).toHaveAttribute("data-state", "answered", { timeout: 90_000 });
  await expect(typed).toHaveText(full);
  await expect(dialog.locator(".talk-live")).toContainText(full);
  await expect(dialog.locator(".talk-choices .talk-chip")).toHaveCount(4);
  await expect(dialog.locator(".talk-choices")).toContainText("voltar ao início");
  await expect(dialog).toHaveAttribute("data-avatar", "idle", { timeout: 20_000 });
});

test("open_dossier opens the card on desktop and offers it as a button on phones", async ({ page, isMobile }) => {
  await enter(page);
  const dialog = await openPanel(page);
  await ask(page, "O que você faz no Nubank?");
  await skip(page);
  await ask(page, "Como funcionam os experimentos de limite?");

  if (!isMobile) {
    await expect(page.locator("#dossier")).toHaveClass(/\bopen\b/);
    await expect(page.locator("#dossier-body")).toContainText("Core Limit Policies");
    await expect(dialog).toBeVisible();
  } else {
    const cta = dialog.locator('.talk-did [data-did="card"]');
    await expect(cta).toBeVisible();
    await expect(page.locator("#dossier")).not.toHaveClass(/\bopen\b/);
    await cta.click();
    await expect(page.locator("#dossier")).toHaveClass(/\bopen\b/);
    await expect(page.locator("#dossier-body")).toContainText("Core Limit Policies");
  }
});

test("keyboard: focus stays in the panel, tour keys do nothing, Esc closes the panel first and then the card", async ({ page, isMobile }) => {
  await enter(page);
  await page.keyboard.press("t");
  const dialog = page.locator("#talk");
  await expect(dialog).toBeVisible();
  await expect.poll(() => focusInside(page)).toBe(true);

  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(await focusInside(page), `Tab ${i}`).toBe(true);
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusInside(page), `Shift+Tab ${i}`).toBe(true);
  }
  for (const key of ["ArrowRight", "PageDown", "End", "3"]) await page.keyboard.press(key);
  await page.waitForTimeout(800);
  await chapter(page, 1);
  await expect(dialog).toBeVisible();

  await dialog.locator(".talk-chip", { hasText: "Quem é você?" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog.locator(".talk-turn")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.classList.contains("talk-fab"))).toBe(true);

  if (isMobile) return;
  await page.keyboard.press("t");
  await expect(dialog).toBeVisible();
  await ask(page, "O que você faz no Nubank?");
  await skip(page);
  await ask(page, "Como funcionam os experimentos de limite?");
  await expect(page.locator("#dossier")).toHaveClass(/\bopen\b/);
  await expect.poll(() => focusInside(page)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("#dossier")).toHaveClass(/\bopen\b/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#dossier")).not.toHaveClass(/\bopen\b/);
});

test("the tour holds still under the open panel and moves again once it closes", async ({ page, isMobile }) => {
  await enter(page);
  await openPanel(page);
  if (isMobile) await swipe(page, 200, 330, 110);
  else {
    await page.mouse.move(1050, 420);
    await page.mouse.wheel(0, 320);
    await page.mouse.move(700, 790);
    await page.mouse.wheel(0, 320);
  }
  await page.waitForTimeout(1_500);
  await chapter(page, 1);
  await expect(page.locator("#tour")).toHaveCSS("overflow-y", "hidden");

  await page.locator("#talk .talk-close").click();
  await expect(page.locator("#talk")).toBeHidden();
  await expect(page.locator("#tour")).not.toHaveCSS("overflow-y", "hidden");
  if (isMobile) await swipe(page, 200, 380, 160);
  else {
    await page.mouse.move(1050, 420);
    await page.mouse.wheel(0, 320);
  }
  await chapter(page, 2);
});

test("voltar ao início and the PT/EN switch", async ({ page }) => {
  await enter(page);
  await openPanel(page);
  const dialog = page.locator("#talk");
  await ask(page, "Como falo com você?");
  await skip(page);
  await dialog.locator(".talk-chip", { hasText: "voltar ao início" }).click();
  await expect(dialog.locator(".talk-choices .talk-chip")).toHaveCount(4);
  await expect(dialog.locator(".talk-choices")).toContainText("Quem é você?");

  await dialog.locator('[data-lang="en"]').click();
  await expect(dialog.locator('[data-lang="en"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("dialog", { name: "Talk to Davi" })).toBeVisible();
  await expect(dialog.locator(".talk-note")).toHaveText(NOTE_EN);
  await ask(page, "Who are you?");
  await expect(dialog.locator(".talk-live")).toContainText(entryOf("who")!.a.en);
  await expect(dialog.locator(".talk-turn").last().locator(".talk-a")).toHaveAttribute("lang", "en");
});

test("side sheet on desktop, bottom sheet on phones; closing gives the page back", async ({ page, isMobile }) => {
  await enter(page);
  await openPanel(page);
  const sheet = page.locator("#talk .talk-sheet");
  const vp = page.viewportSize()!;
  // Let the slide-in finish before measuring.
  await expect.poll(async () => Math.round((await sheet.boundingBox())!.y + (await sheet.boundingBox())!.height)).toBe(isMobile ? vp.height : Math.round(vp.height - 5.4 * 16));
  const box = (await sheet.boundingBox())!;
  if (isMobile) {
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(vp.width);
    expect(Math.round(box.y + box.height)).toBe(vp.height);
    expect(box.height).toBeLessThan(vp.height * 0.6);
  } else {
    expect(box.x).toBeLessThan(80);
    expect(box.width).toBeLessThan(vp.width * 0.4);
    expect(box.height).toBeGreaterThan(vp.height * 0.6);
  }
  await expect(page.locator("#slide")).toBeHidden();

  await page.locator("#talk .talk-close").click();
  await expect(page.locator("#talk")).toBeHidden();
  await expect(page.locator("#slide")).toBeVisible();
  await expect(page.locator(".talk-fab")).toBeVisible();
  // The story ignores keys while its intro glide is still running, so retry until it walks.
  await expect(async () => {
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#counter")).toHaveAttribute("aria-label", "02 de 06", { timeout: 1_500 });
  }).toPass({ timeout: 20_000 });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no camera travel and no typing effect: the chapter is only highlighted", async ({ page }) => {
    await enter(page);
    const dialog = await openPanel(page);
    await ask(page, "O que você faz no Nubank?");
    const typed = dialog.locator(".talk-turn").last().locator(".talk-typed");
    await expect(typed).toHaveText(entryOf("nubank")!.a.pt, { timeout: 5_000 });
    await expect(dialog).toHaveAttribute("data-state", "answered", { timeout: 5_000 });
    await expect(page.locator('#rail [data-rail="war"]')).toHaveClass(/talk-hint/);
    await expect(dialog).toHaveAttribute("data-focus", "nubank");
    await expect(page.locator(".talk-subs")).toHaveClass(/\bon\b/);
    await page.waitForTimeout(3_000);
    await chapter(page, 1);
    await expect(dialog).toHaveAttribute("data-chapter", "desk");
  });
});
