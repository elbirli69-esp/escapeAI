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
  expectPuzzleSolvedMark,
  inferTideLockWord,
  inferTwoBeeps,
  readNarrativeLog,
  requestHintsUntil,
} from "../fixtures/blind-playtest.js";
import { appendPlaytestGrupoRun } from "../fixtures/playtest-grupo-io.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

/** Fase D — muelle: sirena + compuerta sin fixture lighthouse-win. */
test.describe("playtest blind lighthouse entry (Fase D)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("eq-sensorial — niebla y marea hasta almacén", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: string[] = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "lighthouse");
    evidence.push("lighthouse dock started");

    await selectPuzzle(page, "fog_horn");
    await completeSoundListen(page);
    const dockCopy = await page.locator("main.game").innerText();
    const fogHints = await requestHintsUntil(page, 1);
    const horn =
      inferTwoBeeps(dockCopy) ??
      inferTwoBeeps(fogHints.logText) ??
      inferTwoBeeps(await readNarrativeLog(page));
    expect(horn).toBe("2");
    await submitAnswer(page, horn);
    await expectPuzzleSolvedMark(page, "fog_horn");
    evidence.push("fog_horn from dock copy / hints");

    await selectPuzzle(page, "tide_lock");
    await submitAnswer(page, "LOW");
    wrongAttempts += 1;
    const tideHints = await requestHintsUntil(page, 2);
    const tideCombined = `${dockCopy}\n${tideHints.logText}\n${await readNarrativeLog(page)}`;
    const tideCode = inferTideLockWord(tideCombined);
    expect(tideCode, tideCombined.slice(-400)).toBe("HIGH");
    await submitAnswer(page, tideCode);
    await expectPuzzleSolvedMark(page, "tide_lock");
    evidence.push("tide_lock HIGH from placa visible");

    await moveToScene(page, "supply");
    await expect(page.getByRole("button", { name: "Coger" })).toBeVisible({ timeout: 15_000 });
    evidence.push("supply scene + oil pickup visible");

    appendPlaytestGrupoRun({
      roomId: "lighthouse",
      eventId: null,
      adventureType: null,
      teamId: "eq-sensorial",
      teamSize: 3,
      teamProfile: "Sensorial-first — faro acto muelle",
      executionMode: "exploratory",
      won: false,
      partialWin: true,
      wrongAttempts,
      hintDependency: wrongAttempts > 0,
      perceivedProgress: 7.5,
      difficultyScore: 7,
      hintsScore: 8,
      llmStatus: "no_configurado",
      evidence,
      limitations: ["Sin refill_lamp, mirador ni SOS en corrida automatizada."],
    });
  });
});