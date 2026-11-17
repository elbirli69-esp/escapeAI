import { expect, type Page } from "@playwright/test";
import { captureCameraThroughUi, mockCameraForPlaywright } from "./media-mock.js";
import { expectWon, moveToScene, selectPuzzle, submitAnswer } from "./game.js";
import { joinEventAsTeam, SARA_EVENT } from "./events.js";

/** Respuestas derivadas de `generateAdventureRoom` con el fixture SARA_EVENT. */
export const SARA_EVENT_WIN = {
  soundPrefix: "19",
  yearLock: SARA_EVENT.yearLockAnswer,
  camera: "SARA",
  visualCount: "4",
  finalCode: "SGAA",
} as const;

export async function playSaraEventToWin(page: Page, joinCode?: string): Promise<void> {
  await mockCameraForPlaywright(page);
  if (joinCode) {
    await joinEventAsTeam(page, joinCode, "Equipo Victoria");
  }

  await selectPuzzle(page, "sound_intro");
  await page.getByRole("button", { name: /Reproducir pista/ }).click();
  await page.getByRole("button", { name: "Escuchado" }).waitFor({ timeout: 25_000 });
  await submitAnswer(page, SARA_EVENT_WIN.soundPrefix);

  await selectPuzzle(page, "entry_lock");
  await submitAnswer(page, SARA_EVENT_WIN.yearLock);

  await moveToScene(page, "middle");

  await selectPuzzle(page, "camera_hunt");
  await captureCameraThroughUi(page);
  await submitAnswer(page, SARA_EVENT_WIN.camera);

  await page.getByRole("button", { name: "Coger" }).click();
  await selectPuzzle(page, "token_slot");
  await page.getByRole("button", { name: "Usar" }).click();

  await moveToScene(page, "finale");

  await selectPuzzle(page, "visual_gallery");
  const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
  await expect(viewBtn).toBeEnabled({ timeout: 20_000 });
  await viewBtn.click();
  await submitAnswer(page, SARA_EVENT_WIN.visualCount);

  await selectPuzzle(page, "final_code");
  await submitAnswer(page, SARA_EVENT_WIN.finalCode);

  await expectWon(page);
}