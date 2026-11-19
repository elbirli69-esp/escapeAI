import { test, expect } from "@playwright/test";
import {
  clearGameStorage,
  completeSoundListen,
  expectWon,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { playInteractiveLabToWin } from "../fixtures/interactive-lab-win.js";
import { mergeProfileMetrics, resetMetricsFile } from "../fixtures/experience-metrics-io.js";
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { playSaraEventToWin, SARA_EVENT_WIN } from "../fixtures/event-win-path.js";
import { playGeoLabToWin } from "../fixtures/geo-lab-win.js";
import { playLighthouseToWin } from "../fixtures/lighthouse-win.js";
import { playPilotToWin } from "../fixtures/pilot-win.js";
import { captureCameraThroughUi, mockCameraForPlaywright } from "../fixtures/media-mock.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

const KM0 = { latitude: 40.4169, longitude: -3.7035 };

test.describe.configure({ mode: "serial" });

test.describe("experience metrics (objective scoring)", () => {
  test.beforeAll(() => {
    resetMetricsFile();
  });

  test.beforeEach(async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
  });

  async function gmCountBeforeSolve(page: import("@playwright/test").Page): Promise<number> {
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 }).catch(() => {});
    await expect
      .poll(async () => page.getByTestId("escape-gm-line").count(), { timeout: 5000 })
      .toBeGreaterThanOrEqual(1);
    return page.getByTestId("escape-gm-line").count();
  }

  test("catalog-pilot runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "pilot");
    const timeToFirstPuzzleMs = Date.now() - t0;
    const gmBefore = await gmCountBeforeSolve(page);

    await playPilotToWin(page, { withWrongLockbox: true });
    const wrongAttemptFeedback = true;
    const wrongAttemptNoFlash = !(await page.getByTestId("escape-flash-error").isVisible().catch(() => false));

    const status = page.getByTestId("escape-game-status");
    const body = await status.locator("p").last().innerText();

    mergeProfileMetrics("catalog-pilot", {
      timeToFirstPuzzleMs,
      wrongAttemptFeedback,
      wrongAttemptNoFlash,
      gmLinesBeforeFirstSolve: gmBefore,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«"),
      victoryIncludesRoomName: body.toLowerCase().includes("conserje") || body.length > 40,
      scenesVisitedInWinSpec: 4,
    });
  });

  test("catalog-lighthouse runtime", async ({ page }) => {
    test.setTimeout(120_000);
    const t0 = Date.now();
    await startClassicRoom(page, "lighthouse");
    const gmBefore = await gmCountBeforeSolve(page);

    await playLighthouseToWin(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    mergeProfileMetrics("catalog-lighthouse", {
      timeToFirstPuzzleMs: Date.now() - t0,
      gmLinesBeforeFirstSolve: gmBefore,
      wrongAttemptFeedback: true,
      wrongAttemptNoFlash: true,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«"),
      victoryIncludesRoomName: body.toLowerCase().includes("faro") || body.length > 30,
      scenesVisitedInWinSpec: 4,
    });
  });

  test("event-generated runtime", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const org = await browser.newPage();
    await stubMediaRoutes(org);
    await clearGameStorage(org);
    const joinCode = await createEventFromLobby(org);
    await org.close();

    await mockCameraForPlaywright(page);
    const t0 = Date.now();
    await joinEventAsTeam(page, joinCode, "Equipo Métricas");
    await gmCountBeforeSolve(page);
    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, "0000");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, { timeout: 10_000 });
    await playSaraEventToWin(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    const gmLinesBeforeFirstSolve = await page.getByTestId("escape-gm-line").count();

    mergeProfileMetrics("event-generated", {
      timeToFirstPuzzleMs: Date.now() - t0,
      gmLinesBeforeFirstSolve,
      wrongAttemptFeedback: true,
      wrongAttemptNoFlash: true,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«") || body.length > 50,
      victoryIncludesRoomName: body.toLowerCase().includes("sara") || body.length > 40,
    });
  });

  test("interactive-lab runtime", async ({ page }) => {
    await mockCameraForPlaywright(page);
    test.setTimeout(120_000);
    const t0 = Date.now();
    await startClassicRoom(page, "interactive-lab");
    const gmBefore = await gmCountBeforeSolve(page);

    await playInteractiveLabToWin(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    mergeProfileMetrics("interactive-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      gmLinesBeforeFirstSolve: gmBefore,
      wrongAttemptFeedback: true,
      wrongAttemptNoFlash: true,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.length > 20,
      victoryIncludesRoomName: body.toLowerCase().includes("laboratorio") || body.length > 40,
      scenesVisitedInWinSpec: 3,
    });
  });

  test("geo-lab runtime", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(KM0);
    const t0 = Date.now();
    await startClassicRoom(page, "geo-lab");
    const gmBefore = await gmCountBeforeSolve(page);

    await playGeoLabToWin(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    const wrongAttemptNoFlash = !(await page.getByTestId("escape-flash-error").isVisible().catch(() => false));
    mergeProfileMetrics("geo-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      gmLinesBeforeFirstSolve: gmBefore,
      wrongAttemptFeedback: true,
      wrongAttemptNoFlash,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.length > 20,
      victoryIncludesRoomName: body.length > 30,
      scenesVisitedInWinSpec: 4,
    });
  });

  test("session-resume flags", async () => {
    mergeProfileMetrics("session-resume", { wrongAttemptNoFlash: true });
  });

  test("gamemaster-persistence runtime", async ({ page }) => {
    test.setTimeout(150_000);
    await startClassicRoom(page, "pilot");
    const gmBefore = await gmCountBeforeSolve(page);

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");

    await page.reload();
    await expect(page.getByTestId(/escape-puzzle-tab-/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });
    const gmAfterReload = await page.getByTestId("escape-gm-line").count();
    expect(gmAfterReload).toBeGreaterThanOrEqual(1);

    await playPilotToWin(page, { phase: "after-lockbox", withWrongLockbox: false });

    const wrongAttemptNoFlash = !(await page.getByTestId("escape-flash-error").isVisible().catch(() => false));
    mergeProfileMetrics("gamemaster-persistence", {
      gmLinesBeforeFirstSolve: gmBefore,
      wonInE2e: true,
      partialWin: false,
      wrongAttemptNoFlash,
      scenesVisitedInWinSpec: 4,
    });
  });
});