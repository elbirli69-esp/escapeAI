import { expect, type Page } from "@playwright/test";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { SARA_EVENT } from "./events.js";
import {
  expectWon,
  moveToScene,
  selectPuzzle,
  showAllPuzzleTabs,
  submitAnswer,
} from "./game.js";
import { captureCameraThroughUi } from "./media-mock.js";

/** Acto 1 generado: candado de salida → escena middle (P5 prueba foco en acto 2). */
export async function playGeneratedThroughAct1(page: Page, eventId?: string): Promise<void> {
  await showAllPuzzleTabs(page);

  await selectPuzzle(page, "entry_lock");
  const entryAnswer = eventId
    ? mysteryFixtureRoom(eventId).puzzles.entry_lock!.answer!
    : SARA_EVENT.yearLockAnswer;
  await submitAnswer(page, entryAnswer);

  await moveToScene(page, "middle");
  await expect(page.getByTestId("escape-puzzle-tab-camera_hunt")).toBeVisible({ timeout: 15_000 });
}

function mysteryFixtureRoom(eventId: string) {
  return generateAdventureRoom(
    {
      adventureType: "mystery",
      teamCount: 2,
      subject: { name: SARA_EVENT.subjectName, nickname: SARA_EVENT.nickname },
      facts: ["Sospechoso en el muelle", "Hora 23:00", "Llave perdida"],
      eventTitle: "Caso E2E",
      durationMin: 45,
    },
    eventId,
  );
}

/** Acto 2 P5 + finale visual (mystery: sin acusación aún). */
export async function playGeneratedThroughAct2AndFinaleVisual(
  page: Page,
  eventId: string,
): Promise<void> {
  const room = mysteryFixtureRoom(eventId);
  await playGeneratedThroughAct1(page, eventId);
  await selectPuzzle(page, "camera_hunt");
  await captureCameraThroughUi(page);
  await submitAnswer(page, room.puzzles.camera_hunt!.answer!);
  await page.getByRole("button", { name: "Coger" }).click();
  await page.getByRole("button", { name: "Usar" }).click();
  await moveToScene(page, "finale");

  if (room.puzzles.finale_poster) {
    await selectPuzzle(page, "finale_poster");
    await captureCameraThroughUi(page);
    await submitAnswer(page, room.puzzles.finale_poster.answer!);
  }

  await selectPuzzle(page, "visual_gallery");
  await page.getByRole("button", { name: "He estudiado la imagen" }).click();
  await submitAnswer(page, room.puzzles.visual_gallery!.answer!);
}

export async function accuseWhodunit(page: Page, culpritId: string): Promise<void> {
  await selectPuzzle(page, "case_accusation");
  await expect(page.getByTestId("escape-whodunit-panel")).toBeVisible();
  await page.getByTestId(`escape-whodunit-suspect-${culpritId}`).click();
  await page.getByTestId("escape-whodunit-submit").click();
  await expectWon(page);
}