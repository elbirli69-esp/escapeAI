import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  completeSoundListen,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

/** Reproduce orden del playtest novatos: candado antes que timbre, luego mailroom. */
test.describe("pilot exploratory order", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("mailroom carga tras candado primero y timbre después", async ({ page }) => {
    test.setTimeout(120_000);
    await startClassicRoom(page, "pilot");

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");

    await moveToScene(page, "mailroom");

    await expect(page.getByTestId("escape-puzzle-tab-mural_glance")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main.game")).toBeVisible();
    await expect(page.getByText("Cuarto de correspondencia").first()).toBeVisible();
  });
});