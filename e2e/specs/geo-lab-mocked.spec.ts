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

const KM0 = { latitude: 40.4169, longitude: -3.7035 };

test.describe("geo-lab mock GPS", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(KM0);
    await clearGameStorage(page);
  });

  async function confirmLocation(page: import("@playwright/test").Page) {
    await page
      .locator(".location-station")
      .getByRole("button", { name: "Continuar", exact: true })
      .click();
    await page.getByRole("button", { name: "Estoy aquí" }).click();
    await expectNoFlashError(page);
  }

  test("llegar al punto y quiz del entorno", async ({ page }) => {
    await startClassicRoom(page, "geo-lab");
    await selectPuzzle(page, "llegar_sol");
    await confirmLocation(page);

    await moveToScene(page, "quiz_zone");
    await selectPuzzle(page, "ciudad_quiz");
    await confirmLocation(page);
    await submitAnswer(page, "madrid");
    await expectNoFlashError(page);
    await expectWon(page);
  });
});
