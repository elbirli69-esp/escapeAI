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
  inferSingleDigitFromHints,
  readNarrativeLog,
  requestHintsUntil,
  submitUntilPuzzleSolved,
} from "../fixtures/blind-playtest.js";
import { appendPlaytestGrupoRun } from "../fixtures/playtest-grupo-io.js";
import { mockCameraForPlaywright } from "../fixtures/media-mock.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("playtest blind interactive-lab (Fase D)", () => {
  test.beforeEach(async ({ page }) => {
    await clearGameStorage(page);
    await stubMediaRoutes(page);
    await mockCameraForPlaywright(page);
  });

  test("eq-sensorial — cubículo sonido y visual", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: string[] = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "interactive-lab");

    await selectPuzzle(page, "sound_station");
    await completeSoundListen(page);
    await submitAnswer(page, "0");
    wrongAttempts += 1;
    const soundHints = await requestHintsUntil(page, 2);
    const soundCopy = await page.locator("main.game").innerText();
    let digit =
      inferSingleDigitFromHints(`${soundCopy}\n${soundHints.logText}\n${await readNarrativeLog(page)}`) ??
      (await submitUntilPuzzleSolved(page, "sound_station", ["1", "2", "3", "4"]));
    expect(digit).toBeTruthy();
    await expectPuzzleSolvedMark(page, "sound_station");
    evidence.push("sound_station via pistas");

    await selectPuzzle(page, "visual_station");
    const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
    await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
    await viewBtn.click();
    const visualHints = await requestHintsUntil(page, 1);
    const doors = inferSingleDigitFromHints(visualHints.logText);
    expect(doors).toBe("3");
    await submitAnswer(page, doors!);
    await expectPuzzleSolvedMark(page, "visual_station");
    evidence.push("visual_station via pista puertas rojas");

    await moveToScene(page, "camera_bay");
    await expect(page.getByTestId("escape-puzzle-tab-camera_station")).toBeVisible({
      timeout: 15_000,
    });
    evidence.push("camera_bay unlocked");

    appendPlaytestGrupoRun({
      roomId: "interactive-lab",
      eventId: null,
      adventureType: null,
      teamId: "eq-sensorial",
      teamSize: 3,
      teamProfile: "Sensorial-first — lab hub",
      executionMode: "exploratory",
      won: false,
      partialWin: true,
      wrongAttempts,
      hintDependency: true,
      perceivedProgress: 7,
      difficultyScore: 6.5,
      hintsScore: 7,
      llmStatus: "no_configurado",
      evidence,
      limitations: ["Cámaras y voz fuera de corrida ciega (mocks requeridos)."],
    });
  });
});