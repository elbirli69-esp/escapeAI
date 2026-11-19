import { test, expect } from "@playwright/test";
import { playDemoMichelonToWin } from "../fixtures/demo-michelon-win.js";
import { clearGameStorage, showAllPuzzleTabs } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("P6-C demo lobby", () => {
  test.beforeEach(async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
  });

  test("inicio desde lobby y victoria con CTA", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await page.getByTestId("escape-lobby-home").waitFor();
    await page.getByTestId("escape-mode-demo").click();
    await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });
    await showAllPuzzleTabs(page);
    await playDemoMichelonToWin(page);
    await expect(page.getByTestId("escape-demo-cta-create")).toBeVisible();
    await page.getByTestId("escape-demo-cta-create").click();
    await expect(page.getByRole("heading", { name: "Configurar aventura" })).toBeVisible({
      timeout: 15_000,
    });
  });
});