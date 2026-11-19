import { test, expect } from "@playwright/test";
import { clearGameStorage, startClassicRoom } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("director FAQ (GM-6)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("chip tiempo responde en diario sin error", async ({ page }) => {
    await startClassicRoom(page, "pilot");
    await expect(page.getByTestId("escape-director-faq")).toBeVisible();
    const gmBefore = await page.getByTestId("escape-gm-line").count();
    await page.getByTestId("escape-director-faq-time_ok").click();
    await expect(page.getByTestId("escape-flash-error")).not.toBeVisible();
    await expect(
      page.getByTestId("escape-gm-line").filter({ hasText: /tiempo|reloj|ritmo|asequible|min/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});