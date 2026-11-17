import { test } from "@playwright/test";
import { clearGameStorage, expectNoFlashError, startClassicRoom } from "../fixtures/game.js";
import { playGeoLabToWin } from "../fixtures/geo-lab-win.js";

const KM0 = { latitude: 40.4169, longitude: -3.7035 };

test.describe("geo-lab mock GPS", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(KM0);
    await clearGameStorage(page);
  });

  test("llegar al punto y quiz del entorno", async ({ page }) => {
    await startClassicRoom(page, "geo-lab");
    await playGeoLabToWin(page, { quizWrongCity: false });
    await expectNoFlashError(page);
  });
});