import type { Page } from "@playwright/test";
import {
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  submitAnswer,
} from "./game.js";

export async function playDemoMichelonToWin(page: Page): Promise<void> {
  await selectPuzzle(page, "kettle_tone");
  await completeSoundListen(page);
  await submitAnswer(page, "3");
  await selectPuzzle(page, "pantry_lock");
  await submitAnswer(page, "315");
  await moveToScene(page, "table");
  await selectPuzzle(page, "toast_seal");
  await submitAnswer(page, "TOMA");
  await expectWon(page);
}