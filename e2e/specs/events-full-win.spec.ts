import { test } from "@playwright/test";
import { createEventFromLobby } from "../fixtures/events.js";
import { playSaraEventToWin } from "../fixtures/event-win-path.js";
import { clearGameStorage } from "../fixtures/game.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe("event full victory", () => {
  test.describe.configure({ timeout: 180_000 });

  test("recorrido generado hasta victoria (fixture Sara)", async ({ page, browser }) => {
    const org = await browser.newPage();
    await stubMediaRoutes(org);
    await clearGameStorage(org);
    const joinCode = await createEventFromLobby(org);
    await org.close();

    await stubMediaRoutes(page);
    await clearGameStorage(page);
    await playSaraEventToWin(page, joinCode);
  });
});