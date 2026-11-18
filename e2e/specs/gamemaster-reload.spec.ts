import { test, expect } from "@playwright/test";
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import {
  clearGameStorage,
  completeSoundListen,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { playPilotToWin } from "../fixtures/pilot-win.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("GameMaster PWA", () => {
  test.describe.configure({ timeout: 120_000 });

  test("recupera intervenciones GM tras recargar", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    const joinCode = await createEventFromLobby(page);
    await joinEventAsTeam(page, joinCode, "Equipo GM QA");

    const gmLine = page.getByTestId("escape-gm-line").first();
    await expect(gmLine).toBeVisible({ timeout: 15_000 });
    await expect(gmLine).toContainText("Equipo GM QA");
    await expect(gmLine).toContainText("Misterio de Sara");

    await page.reload();
    await expect(page.getByTestId(/escape-puzzle-tab-/).first()).toBeVisible({ timeout: 30_000 });
    const gmAfter = page.getByTestId("escape-gm-line").first();
    await expect(gmAfter).toBeVisible({ timeout: 15_000 });
    await expect(gmAfter).toContainText("Equipo GM QA");
    await expect(gmAfter).toContainText("Misterio de Sara");
  });

  test("partida clásica conserva GM y victoria tras recargar", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await startClassicRoom(page, "pilot");
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");
    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");

    await page.reload();
    await expect(page.getByTestId(/escape-puzzle-tab-/).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });

    await playPilotToWin(page, { phase: "after-lockbox", withWrongLockbox: false });
  });
});
