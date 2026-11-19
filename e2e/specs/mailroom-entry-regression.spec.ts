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

/** Regresión: orden novatos (candado→timbre) + salida a mailroom sin bucle React. */
test.describe("mailroom entry regression", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("mailroom visible sin Maximum update depth", async ({ page }) => {
    test.setTimeout(120_000);
    const depthErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && /Maximum update depth exceeded/i.test(msg.text())) {
        depthErrors.push(msg.text());
      }
    });

    await startClassicRoom(page, "pilot");
    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "0000");
    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");
    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");

    await moveToScene(page, "mailroom");
    await expect(page.getByTestId("escape-puzzle-tab-mural_glance")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Cuarto de correspondencia").first()).toBeVisible();
    expect(depthErrors).toEqual([]);
  });
});