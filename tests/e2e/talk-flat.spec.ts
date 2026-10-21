import { expect, test } from "@playwright/test";
import { entryOf } from "../../src/talk/qa";

/** Without WebGL the site falls back to the résumé over a still; the panel keeps working on top of it. */
test.use({ launchOptions: { args: ["--disable-3d-apis", "--disable-webgl"] } });

test("without WebGL the chips still answer, walk the tour and open the cards", async ({ page, isMobile }) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));

  await page.goto("/");
  await expect(page.locator("#intro .cta")).toBeVisible();
  await expect(async () => {
    await page.keyboard.press("Enter");
    await expect(page.locator("#intro")).toHaveClass(/gone/, { timeout: 2_000 });
  }).toPass({ timeout: 40_000 });
  await expect(page.locator("#stage")).toHaveClass(/\bflat\b/);
  await page.waitForFunction(() => document.body.classList.contains("talk-ready"), null, { timeout: 40_000 });

  await page.locator(".talk-fab").click();
  const dialog = page.getByRole("dialog", { name: "Fale com o Davi" });
  await expect(dialog).toBeVisible();
  await dialog.locator(".talk-chip", { hasText: "O que você faz no Nubank?" }).click();
  await expect(page.locator("#counter")).toHaveAttribute("aria-label", "02 de 06");
  await expect(dialog).toHaveAttribute("data-state", "answered", { timeout: 60_000 });
  await expect(dialog.locator(".talk-live")).toContainText(entryOf("nubank")!.a.pt);
  await expect(dialog).toHaveAttribute("data-focus", "");

  await dialog.locator(".talk-chip", { hasText: "Como funcionam os experimentos de limite?" }).click();
  if (isMobile) await dialog.locator('.talk-did [data-did="card"]').click();
  await expect(page.locator("#dossier")).toHaveClass(/\bopen\b/);
  await expect(page.locator("#dossier-body")).toContainText("Core Limit Policies");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(problems, "console errors").toEqual([]);
});
