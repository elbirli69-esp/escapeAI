import { test } from "@playwright/test";
import { clearGameStorage, expectNoFlashError, startClassicRoom } from "../fixtures/game.js";
import { playInteractiveLabToWin } from "../fixtures/interactive-lab-win.js";
import { mockCameraForPlaywright } from "../fixtures/media-mock.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("interactive-lab", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
    await mockCameraForPlaywright(page);
  });

  test("sonido, visual, cámara y voz por la UI", async ({ page }) => {
    test.setTimeout(120_000);
    await startClassicRoom(page, "interactive-lab");
    await playInteractiveLabToWin(page);
    await expectNoFlashError(page);
  });
});