import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/** Not a check: saves one screenshot per chapter (plus the intro) for visual review. */
const root = process.env.TOUR_SHOTS_DIR;
test.skip(!root, "set TOUR_SHOTS_DIR to save one screenshot per chapter");

test("tour shots", async ({ page }, info) => {
  const dir = join(root!, info.project.name);
  mkdirSync(dir, { recursive: true });
  await page.goto("/");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(dir, "0-intro.png") });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);
  for (let n = 1; n <= 6; n++) {
    await page.keyboard.press(String(n));
    await page.waitForTimeout(7000);
    await page.screenshot({ path: join(dir, `${n}-chapter.png`) });
  }
});
