import { expect, type Page } from "@playwright/test";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  submitAnswer,
} from "./game.js";

export type PilotWinPhase = "start" | "after-lockbox";

export async function playPilotToWin(
  page: Page,
  opts?: { phase?: PilotWinPhase; withWrongLockbox?: boolean },
): Promise<void> {
  const phase = opts?.phase ?? "start";

  if (phase === "start") {
    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");

    await selectPuzzle(page, "concierge_hail");
    await page.getByPlaceholder("O escribe la frase aquí").fill("conserje");
    await page.getByRole("button", { name: "Enviar texto" }).click();

    await selectPuzzle(page, "lockbox");
    if (opts?.withWrongLockbox !== false) {
      await submitAnswer(page, "0000");
      await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, {
        timeout: 10_000,
      });
    }
    await submitAnswer(page, "1984");
  }

  await moveToScene(page, "mailroom");
  await selectPuzzle(page, "mural_glance");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
  await viewBtn.click();
  await submitAnswer(page, "2");

  await moveToScene(page, "basement");
  await page.getByRole("button", { name: "Coger" }).click();
  await selectPuzzle(page, "fuse_slot");
  await page.getByRole("button", { name: "Usar" }).click();

  await moveToScene(page, "control");
  await selectPuzzle(page, "panel_final");
  await submitAnswer(page, "LUZ");
  await expectWon(page);
}