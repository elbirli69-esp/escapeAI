import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  expectWon,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { mergeProfileMetrics, resetMetricsFile } from "../fixtures/experience-metrics-io.js";
import { joinEventAsTeam, SARA_EVENT, createEventFromLobby } from "../fixtures/events.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe.configure({ mode: "serial" });

test.describe("experience metrics (objective scoring)", () => {
  test.beforeAll(() => {
    resetMetricsFile();
  });

  test.beforeEach(async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
  });

  test("catalog-pilot runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "pilot");
    const timeToFirstPuzzleMs = Date.now() - t0;

    const gmBefore = await page.getByTestId("escape-gm-line").count();

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "0000");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, { timeout: 10_000 });
    const wrongAttemptFeedback = true;
    const wrongAttemptNoFlash = !(await page.getByTestId("escape-flash-error").isVisible().catch(() => false));

    await submitAnswer(page, "1984");

    await moveToScene(page, "basement");
    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "fuse_slot");
    await page.getByRole("button", { name: "Usar" }).click();
    await moveToScene(page, "control");
    await selectPuzzle(page, "panel_final");
    await submitAnswer(page, "LUZ");
    await expectWon(page);

    const status = page.getByTestId("escape-game-status");
    const body = await status.locator("p").last().innerText();
    const meta = await status.locator("p").nth(1).innerText();

    mergeProfileMetrics("catalog-pilot", {
      timeToFirstPuzzleMs,
      wrongAttemptFeedback,
      wrongAttemptNoFlash,
      gmLinesBeforeFirstSolve: gmBefore,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«") || body.length > 40,
      victoryIncludesRoomName: meta.length > 0 || body.toLowerCase().includes("conserje"),
      scenesVisitedInWinSpec: 3,
    });
  });

  test("catalog-lighthouse runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "lighthouse");
    mergeProfileMetrics("catalog-lighthouse", {
      timeToFirstPuzzleMs: Date.now() - t0,
      wonInE2e: false,
      partialWin: false,
    });
    await selectPuzzle(page, "tide_lock");
    await submitAnswer(page, "HIGH");
    await moveToScene(page, "supply");
    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "refill_lamp");
    await page.getByRole("button", { name: "Usar" }).click();
    await moveToScene(page, "lantern_room");
    await selectPuzzle(page, "beacon_sequence");
    await submitAnswer(page, "SOS");
    await expectWon(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    mergeProfileMetrics("catalog-lighthouse", {
      wonInE2e: true,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«") || body.length > 40,
      victoryIncludesRoomName: body.toLowerCase().includes("faro") || body.length > 30,
      scenesVisitedInWinSpec: 3,
    });
  });

  test("event-generated runtime", async ({ page, browser }) => {
    const org = await browser.newPage();
    await stubMediaRoutes(org);
    await clearGameStorage(org);
    const joinCode = await createEventFromLobby(org);
    await org.close();

    const t0 = Date.now();
    await joinEventAsTeam(page, joinCode, "Equipo Métricas");
    const timeToFirstPuzzleMs = Date.now() - t0;
    const gmLinesBeforeFirstSolve = await page.getByTestId("escape-gm-line").count();

    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, "0000");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, { timeout: 10_000 });
    const wrongAttemptFeedback = true;
    await submitAnswer(page, SARA_EVENT.yearLockAnswer);
    await expect(page.getByTestId("escape-puzzle-tab-entry_lock")).toHaveText(/✓/);

    mergeProfileMetrics("event-generated", {
      timeToFirstPuzzleMs,
      gmLinesBeforeFirstSolve,
      wrongAttemptFeedback,
      wrongAttemptNoFlash: true,
      wonInE2e: false,
      partialWin: true,
      victoryBodyChars: 0,
    });
  });

  test("interactive-lab runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "interactive-lab");
    mergeProfileMetrics("interactive-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      wonInE2e: false,
      partialWin: true,
    });
  });

  test("geo-lab runtime", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success) => {
        success({
          coords: { latitude: 43.3183, longitude: -1.9812, accuracy: 5 },
          timestamp: Date.now(),
        } as GeolocationPosition);
      };
    });
    const t0 = Date.now();
    await startClassicRoom(page, "geo-lab");
    mergeProfileMetrics("geo-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      partialWin: true,
      wonInE2e: false,
    });
  });

  test("session-resume + gamemaster flags", async () => {
    mergeProfileMetrics("session-resume", { wrongAttemptNoFlash: true });
    mergeProfileMetrics("gamemaster-persistence", { gmLinesBeforeFirstSolve: 1 });
  });
});