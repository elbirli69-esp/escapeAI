import { test } from "@playwright/test";
import { clearGameStorage, expectNoFlashError, startClassicRoom } from "../fixtures/game.js";
import { playOfficeToWin } from "../fixtures/office-win.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("office catalog victory (P6-E)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("recorrido investigación y veredicto whodunit", async ({ page }) => {
    test.setTimeout(120_000);
    await startClassicRoom(page, "office");
    await playOfficeToWin(page);
    await expectNoFlashError(page);
  });
});