import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  completeSoundListen,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import {
  expectPuzzleSolvedMark,
  inferTwoBeeps,
  inferYearFromSpokenDigits,
  readNarrativeLog,
  requestHintsUntil,
} from "../fixtures/blind-playtest.js";
import { appendPlaytestGrupoRun } from "../fixtures/playtest-grupo-io.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("playtest blind office entry", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
  });

  test("eq-novatos — torniquete y credencial hasta open space", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: string[] = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "office");
    evidence.push("office catalog started");

    await selectPuzzle(page, "turnstile_tone");
    await completeSoundListen(page);
    const turnstileCopy = await page.locator("main.game").innerText();
    const turnstileHints = await requestHintsUntil(page, 1);
    const beeps =
      inferTwoBeeps(turnstileCopy) ??
      inferTwoBeeps(turnstileHints.logText);
    expect(beeps).toBe("2");
    await submitAnswer(page, beeps);
    await expectPuzzleSolvedMark(page, "turnstile_tone");
    evidence.push("turnstile_tone via copy/pistas");

    await selectPuzzle(page, "audit_year");
    await submitAnswer(page, "1999");
    wrongAttempts += 1;
    const sceneCopy = await page.locator("main.game").innerText();
    const auditHints = await requestHintsUntil(page, 2);
    const combined = `${sceneCopy}\n${auditHints.logText}\n${await readNarrativeLog(page)}`;
    const year = inferYearFromSpokenDigits(combined);
    expect(year, combined.slice(-500)).toBeTruthy();
    await submitAnswer(page, year!);
    await expectPuzzleSolvedMark(page, "audit_year");
    evidence.push(`audit_year → ${year} (escena + pistas)`);

    await expect(page.getByTestId("escape-exit-open_space")).toBeEnabled({ timeout: 15_000 });
    evidence.push("exit open_space available");

    appendPlaytestGrupoRun({
      roomId: "office",
      eventId: null,
      adventureType: null,
      teamId: "eq-novatos",
      teamSize: 4,
      teamProfile: "Novatos ER — office ciego acto 1",
      executionMode: "exploratory",
      won: false,
      partialWin: true,
      wrongAttempts,
      hintDependency: true,
      perceivedProgress: 7,
      difficultyScore: 7.5,
      hintsScore: 8,
      llmStatus: "no_configurado",
      evidence,
      limitations: ["Sin whodunit ni hubs posteriores en esta corrida automatizada."],
    });
  });
});