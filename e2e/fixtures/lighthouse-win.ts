import { expect, type Page } from "@playwright/test";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  submitAnswer,
} from "./game.js";

export async function playLighthouseToWin(
  page: Page,
  opts?: { withWrongTide?: boolean },
): Promise<void> {
  await selectPuzzle(page, "fog_horn");
  await completeSoundListen(page);
  await submitAnswer(page, "2");

  await selectPuzzle(page, "tide_lock");
  if (opts?.withWrongTide !== false) {
    await submitAnswer(page, "LOW");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, {
      timeout: 10_000,
    });
  }
  await submitAnswer(page, "HIGH");

  await moveToScene(page, "supply");
  await page.getByRole("button", { name: "Coger" }).click();
  await selectPuzzle(page, "refill_lamp");
  await page.getByRole("button", { name: "Usar" }).click();

  await moveToScene(page, "lookout");
  await selectPuzzle(page, "storm_photo");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
  await viewBtn.click();
  await submitAnswer(page, "3");

  await moveToScene(page, "lantern_room");
  await selectPuzzle(page, "keeper_hail");
  await page.getByPlaceholder("O escribe la frase aquí").fill("sos");
  await page.getByRole("button", { name: "Enviar texto" }).click();

  await selectPuzzle(page, "beacon_sequence");
  await submitAnswer(page, "SOS");
  await expectWon(page);
}