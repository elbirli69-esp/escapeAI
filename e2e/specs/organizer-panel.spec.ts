import { test, expect } from "@playwright/test";
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { clearGameStorage } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe.serial("organizer panel", () => {
  let joinCode: string;
  const teamName = "Equipo Proyector";

  test.beforeAll(async ({ browser }) => {
    const setup = await browser.newPage();
    await stubMediaRoutes(setup);
    await clearGameStorage(setup);
    joinCode = await createEventFromLobby(setup);

    const player = await browser.newPage();
    await stubMediaRoutes(player);
    await clearGameStorage(player);
    await joinEventAsTeam(player, joinCode, teamName);
    await player.close();
    await setup.close();
  });

  test("formulario no abre ranking hasta pulsar Ver ranking", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Panel organizador" }).click();
    await page.getByTestId("escape-organizer-code-input").fill(joinCode);
    await expect(page.getByTestId("escape-organizer-board")).not.toBeVisible();
    await page.getByTestId("escape-organizer-open").click();
    await expect(page.getByTestId("escape-organizer-board")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("escape-leaderboard-list")).toContainText(teamName, {
      timeout: 15_000,
    });
  });
});
