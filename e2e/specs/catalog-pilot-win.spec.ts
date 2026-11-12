import { test } from "@playwright/test";
import {
  clearGameStorage,
  expectNoFlashError,
  expectWon,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("pilot victory", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("recorrido completo hasta victoria", async ({ page }) => {
    await startClassicRoom(page, "pilot");

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");
    await expectNoFlashError(page);

    await moveToScene(page, "basement");
    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "fuse_slot");
    await page.getByRole("button", { name: "Usar" }).click();
    await expectNoFlashError(page);

    await moveToScene(page, "control");
    await selectPuzzle(page, "panel_final");
    await submitAnswer(page, "LUZ");
    await expectNoFlashError(page);

    await expectWon(page);
  });
});
