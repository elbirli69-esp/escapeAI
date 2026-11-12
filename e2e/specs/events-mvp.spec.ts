import { test, expect } from "@playwright/test";
import { SARA_EVENT, createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { clearGameStorage, selectPuzzle, submitAnswer } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe.serial("events MVP", () => {
  test.describe.configure({ timeout: 120_000 });
  let joinCode: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    joinCode = await createEventFromLobby(page);
    await page.close();
  });

  test("dos equipos obtienen sesiones distintas", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await stubMediaRoutes(pageA);
    await stubMediaRoutes(pageB);

    await joinEventAsTeam(pageA, joinCode, "Equipo Rojo");
    await joinEventAsTeam(pageB, joinCode, "Equipo Azul");

    const idA = await pageA.evaluate(() => localStorage.getItem("escapeai.sessionId"));
    const idB = await pageB.evaluate(() => localStorage.getItem("escapeai.sessionId"));
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);

    await ctxA.close();
    await ctxB.close();
  });

  test("candado numérico del evento generado", async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await joinEventAsTeam(page, joinCode, "Equipo QA");
    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, SARA_EVENT.yearLockAnswer);
    await expect(page.getByTestId("escape-puzzle-tab-entry_lock")).toHaveText(/✓/, {
      timeout: 10_000,
    });
  });
});
