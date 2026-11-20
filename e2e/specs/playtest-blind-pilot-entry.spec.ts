import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  completeSoundListen,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import {
  inferSingleBeepDigit,
  inferYearFromHintText,
  requestHintsUntil,
  expectPuzzleSolvedMark,
} from "../fixtures/blind-playtest.js";
import { appendPlaytestGrupoRun } from "../fixtures/playtest-grupo-io.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

/**
 * Sesión ciega automatizada (sin fixtures *-win ni answers del YAML).
 * Simula perfil novatos: fallos, pistas y deducción desde copy visible.
 */
test.describe("playtest blind pilot entry", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("eq-novatos — candado por pistas, timbre y mailroom", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: string[] = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "pilot");
    evidence.push("lobby catalog pilot started");

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "0000");
    wrongAttempts += 1;
    await submitAnswer(page, "1234");
    wrongAttempts += 1;

    const lockHints = await requestHintsUntil(page, 3);
    evidence.push(`lockbox hints=${lockHints.hintCount}`);
    const year = inferYearFromHintText(lockHints.logText);
    expect(year, `log: ${lockHints.logText.slice(-400)}`).toBeTruthy();
    await submitAnswer(page, year!);
    await expectPuzzleSolvedMark(page, "lockbox");
    evidence.push(`lockbox solved via hints → ${year}`);

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    const intercomCopy = await page.locator("main.game").innerText();
    const intercomHints = await requestHintsUntil(page, 1);
    const digit =
      inferSingleBeepDigit(intercomCopy) ??
      inferSingleBeepDigit(intercomHints.logText);
    expect(digit).toBe("1");
    await submitAnswer(page, digit);
    await expectPuzzleSolvedMark(page, "intercom_tone");
    evidence.push("intercom solved via hint pitido único");

    await moveToScene(page, "mailroom");
    await expect(page.getByTestId("escape-puzzle-tab-mural_glance")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main.game")).toBeVisible();
    evidence.push("mailroom visible sin crash");

    appendPlaytestGrupoRun({
      roomId: "pilot",
      eventId: null,
      adventureType: null,
      teamId: "eq-novatos",
      teamSize: 4,
      teamProfile: "Novatos ER — automatizado ciego",
      executionMode: "exploratory",
      won: false,
      partialWin: true,
      wrongAttempts,
      hintDependency: true,
      perceivedProgress: 7,
      difficultyScore: 7,
      hintsScore: 7,
      llmStatus: "no_configurado",
      evidence,
      limitations: ["Sin victoria completa; no lee mural_glance ni sótano."],
    });
  });
});