import { test, expect } from "@playwright/test";
import { startClassicRoom } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("resume session banner", () => {
  test("nueva pestaña con sesión guardada muestra continuar o abandonar", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await stubMediaRoutes(pageA);
    await startClassicRoom(pageA, "pilot");
    await pageA.getByTestId(/escape-puzzle-tab-/).first().waitFor();

    const saved = await pageA.evaluate(() => ({
      sessionId: localStorage.getItem("escapeai.sessionId"),
      roomId: localStorage.getItem("escapeai.roomId"),
    }));
    expect(saved.sessionId).toBeTruthy();

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await stubMediaRoutes(pageB);
    await pageB.goto("/");
    await pageB.evaluate((payload) => {
      localStorage.setItem("escapeai.sessionId", payload.sessionId!);
      if (payload.roomId) localStorage.setItem("escapeai.roomId", payload.roomId);
    }, saved);
    await pageB.reload();
    await expect(pageB.getByTestId("escape-resume-banner")).toBeVisible({ timeout: 10_000 });
    await pageB.getByTestId("escape-resume-continue").click();
    await expect(pageB.getByTestId(/escape-puzzle-tab-/).first()).toBeVisible({ timeout: 30_000 });

    await ctxA.close();
    await ctxB.close();
  });
});
