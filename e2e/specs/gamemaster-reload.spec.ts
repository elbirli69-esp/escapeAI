import { test, expect } from "@playwright/test";
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { clearGameStorage } from "../fixtures/game.js";
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

  test("partida clásica muestra director sin API keys", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await page.goto("/");
    await page.getByTestId("escape-lobby-home").waitFor();
    await page.getByTestId("escape-mode-catalog").click();
    await page.getByTestId("escape-room-pilot").click();
    await page.getByTestId("escape-start-classic").click();
    await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });
  });
});
