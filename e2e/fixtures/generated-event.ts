import { expect, type Page } from "@playwright/test";
import { SARA_EVENT } from "./events.js";
import {
  moveToScene,
  selectPuzzle,
  showAllPuzzleTabs,
  submitAnswer,
} from "./game.js";

/** Acto 1 generado: candado de salida → escena middle (P5 prueba foco en acto 2). */
export async function playGeneratedThroughAct1(page: Page): Promise<void> {
  await showAllPuzzleTabs(page);

  await selectPuzzle(page, "entry_lock");
  await submitAnswer(page, SARA_EVENT.yearLockAnswer);

  await moveToScene(page, "middle");
  await expect(page.getByTestId("escape-puzzle-tab-camera_hunt")).toBeVisible({ timeout: 15_000 });
}