import { test } from "@playwright/test";
import { clearGameStorage, expectNoFlashError, startClassicRoom } from "../fixtures/game.js";
import { playLighthouseToWin } from "../fixtures/lighthouse-win.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("lighthouse victory", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("recorrido completo hasta victoria", async ({ page }) => {
    test.setTimeout(120_000);
    await startClassicRoom(page, "lighthouse");
    await playLighthouseToWin(page, { withWrongTide: false });
    await expectNoFlashError(page);
  });
});