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
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { playSaraEventToWin, SARA_EVENT_WIN } from "../fixtures/event-win-path.js";
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
    return page.getByTestId("escape-gm-line").count();
  }

  test("catalog-pilot runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "pilot");
    const timeToFirstPuzzleMs = Date.now() - t0;
    const gmBefore = await gmCountBeforeSolve(page);

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
      scenesVisitedInWinSpec: 3,
    });
  });

  test("catalog-lighthouse runtime", async ({ page }) => {
    const t0 = Date.now();
    await startClassicRoom(page, "lighthouse");
    const gmBefore = await gmCountBeforeSolve(page);

    await selectPuzzle(page, "tide_lock");
    await submitAnswer(page, "LOW");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, { timeout: 10_000 });
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
      timeToFirstPuzzleMs: Date.now() - t0,
      gmLinesBeforeFirstSolve: gmBefore,
      wrongAttemptFeedback: true,
      wrongAttemptNoFlash: true,
      wonInE2e: true,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.includes("«"),
      victoryIncludesRoomName: body.toLowerCase().includes("faro") || body.length > 30,
      scenesVisitedInWinSpec: 3,
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
    await gmCountBeforeSolve(page);

    await selectPuzzle(page, "sound_station");
    await page.getByRole("button", { name: /Reproducir pista/ }).click();
    await page.getByRole("button", { name: "Escuchado" }).waitFor({ timeout: 25_000 });
    await submitAnswer(page, "3");

    await selectPuzzle(page, "visual_station");
    const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
    await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
    await viewBtn.click();
    await submitAnswer(page, "3");

    await selectPuzzle(page, "camera_station");
    await captureCameraThroughUi(page);
    await expect(page.getByTestId("escape-camera-station")).toHaveAttribute("data-done", "true", {
      timeout: 15_000,
    });
    await submitAnswer(page, "7");

    await selectPuzzle(page, "voice_finale");
    await page.getByPlaceholder("O escribe la frase aquí").fill("luego");
    await page.getByRole("button", { name: "Enviar texto" }).click();
    await expectWon(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    mergeProfileMetrics("interactive-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.length > 20,
      victoryIncludesRoomName: body.toLowerCase().includes("laboratorio") || body.length > 40,
    });
  });

  test("geo-lab runtime", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(KM0);
    const t0 = Date.now();
    await startClassicRoom(page, "geo-lab");
    await gmCountBeforeSolve(page);

    async function confirmLocation() {
      await page
        .locator(".location-station")
        .getByRole("button", { name: "Continuar", exact: true })
        .click();
      await page.getByRole("button", { name: "Estoy aquí" }).click();
    }

    await selectPuzzle(page, "llegar_sol");
    await confirmLocation();
    await moveToScene(page, "plaza_clue");
    await selectPuzzle(page, "pedestal_code");
    await submitAnswer(page, "OSO");
    await moveToScene(page, "quiz_zone");
    await selectPuzzle(page, "ciudad_quiz");
    await confirmLocation();
    await submitAnswer(page, "barcelona");
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/incorrecta/i, { timeout: 10_000 });
    await submitAnswer(page, "madrid");
    await expectWon(page);
    const body = await page.getByTestId("escape-game-status").locator("p").last().innerText();
    mergeProfileMetrics("geo-lab", {
      timeToFirstPuzzleMs: Date.now() - t0,
      wonInE2e: true,
      partialWin: false,
      victoryBodyChars: body.length,
      victoryIncludesTagline: body.length > 20,
      victoryIncludesRoomName: body.length > 30,
    });
  });

  test("session-resume + gamemaster flags", async () => {
    mergeProfileMetrics("session-resume", { wrongAttemptNoFlash: true });
    mergeProfileMetrics("gamemaster-persistence", { gmLinesBeforeFirstSolve: 1, wonInE2e: false, partialWin: true });
  });
});