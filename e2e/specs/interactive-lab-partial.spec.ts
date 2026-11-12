import { test } from "@playwright/test";
import {
  clearGameStorage,
  expectNoFlashError,
  expectWon,
  postAction,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("interactive-lab", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("sonido, visual, cámara (API), voz texto", async ({ page }) => {
    await startClassicRoom(page, "interactive-lab");

    await selectPuzzle(page, "sound_station");
    await page.getByRole("button", { name: /Reproducir pista/ }).click();
    await page.getByRole("button", { name: "Escuchado" }).waitFor({ timeout: 25_000 });
    await submitAnswer(page, "3");
    await expectNoFlashError(page);

    await selectPuzzle(page, "visual_station");
    await page.getByRole("button", { name: "He estudiado la imagen" }).waitFor({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "He estudiado la imagen" }).click();
    await submitAnswer(page, "3");
    await expectNoFlashError(page);

    await selectPuzzle(page, "camera_station");
    await postAction(page, {
      type: "complete_interaction",
      puzzleId: "camera_station",
      step: "capture",
    });
    await selectPuzzle(page, "camera_station");
    await submitAnswer(page, "7");
    await expectNoFlashError(page);

    await selectPuzzle(page, "voice_finale");
    await page.getByPlaceholder("O escribe la frase aquí").fill("luego");
    await page.getByRole("button", { name: "Enviar texto" }).click();
    await expectNoFlashError(page);

    await expectWon(page);
  });
});
