import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  expectNoFlashError,
  expectWon,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { captureCameraThroughUi, mockCameraForPlaywright } from "../fixtures/media-mock.js";
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

    await selectPuzzle(page, "sound_station");
    await page.getByRole("button", { name: /Reproducir pista/ }).click();
    await page.getByRole("button", { name: "Escuchado" }).waitFor({ timeout: 25_000 });
    await submitAnswer(page, "3");
    await expectNoFlashError(page);

    await selectPuzzle(page, "visual_station");
    const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
    await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
    await viewBtn.click();
    await submitAnswer(page, "3");
    await expectNoFlashError(page);

    await selectPuzzle(page, "camera_station");
    await captureCameraThroughUi(page);
    await expect(page.getByTestId("escape-camera-station")).toHaveAttribute("data-done", "true", {
      timeout: 15_000,
    });
    await submitAnswer(page, "7");
    await expectNoFlashError(page);

    await selectPuzzle(page, "voice_finale");
    await page.getByPlaceholder("O escribe la frase aquí").fill("luego");
    await page.getByRole("button", { name: "Enviar texto" }).click();
    await expectNoFlashError(page);

    await expectWon(page);
  });
});
