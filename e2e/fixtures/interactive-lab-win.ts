import type { Page } from "@playwright/test";
import { captureCameraThroughUi } from "./media-mock.js";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  submitAnswer,
} from "./game.js";
import { expect } from "@playwright/test";

export async function playInteractiveLabToWin(page: Page): Promise<void> {
  await selectPuzzle(page, "sound_station");
  await completeSoundListen(page);
  await submitAnswer(page, "0");
  await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, {
    timeout: 10_000,
  });
  await submitAnswer(page, "3");

  await selectPuzzle(page, "visual_station");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
  await viewBtn.click();
  await submitAnswer(page, "3");

  await moveToScene(page, "camera_bay");

  await selectPuzzle(page, "camera_station");
  await captureCameraThroughUi(page);
  await expect(page.getByTestId("escape-camera-station")).toHaveAttribute("data-done", "true", {
    timeout: 15_000,
  });
  await submitAnswer(page, "7");

  await moveToScene(page, "voice_chamber");

  await selectPuzzle(page, "sigil_lock");
  await submitAnswer(page, "SENSOR");

  await selectPuzzle(page, "voice_finale");
  await page.getByPlaceholder("O escribe la frase aquí").fill("luego");
  await page.getByRole("button", { name: "Enviar texto" }).click();

  await expectWon(page);
}