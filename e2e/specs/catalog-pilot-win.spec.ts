import { test } from "@playwright/test";
import { clearGameStorage, expectNoFlashError, startClassicRoom } from "../fixtures/game.js";
import { playPilotToWin } from "../fixtures/pilot-win.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("pilot victory", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("recorrido completo hasta victoria", async ({ page }) => {
    test.setTimeout(120_000);
    await startClassicRoom(page, "pilot");
    await playPilotToWin(page);
    await expectNoFlashError(page);
  });
});