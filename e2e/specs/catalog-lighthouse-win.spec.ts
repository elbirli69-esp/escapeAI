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

test.describe("lighthouse victory", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("recorrido completo hasta victoria", async ({ page }) => {
    await startClassicRoom(page, "lighthouse");

    await selectPuzzle(page, "tide_lock");
    await submitAnswer(page, "HIGH");
    await expectNoFlashError(page);

    await moveToScene(page, "supply");
    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "refill_lamp");
    await page.getByRole("button", { name: "Usar" }).click();
    await expectNoFlashError(page);

    await moveToScene(page, "lantern_room");
    await selectPuzzle(page, "beacon_sequence");
    await submitAnswer(page, "SOS");
    await expectNoFlashError(page);

    await expectWon(page);
  });
});
