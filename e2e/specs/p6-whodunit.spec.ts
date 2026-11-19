import { test, expect } from "@playwright/test";
import { pickWhodunitCulprit } from "@escapeai/escape-content";
import { createMysteryEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import {
  accuseWhodunit,
  playGeneratedThroughAct2AndFinaleVisual,
} from "../fixtures/generated-event.js";
import { clearGameStorage } from "../fixtures/game.js";
import { mockCameraForPlaywright } from "../fixtures/media-mock.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

test.describe.serial("P6-A whodunit mystery", () => {
  test.describe.configure({ timeout: 180_000 });
  let joinCode: string;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await stubMediaRoutes(page);
    await clearGameStorage(page);
    const created = await createMysteryEventFromLobby(page);
    joinCode = created.joinCode;
    eventId = created.eventId;
    await page.close();
  });

  test("victoria por acusación correcta en UI", async ({ page }) => {
    await stubMediaRoutes(page);
    await mockCameraForPlaywright(page);
    await clearGameStorage(page);
    const culprit = pickWhodunitCulprit(eventId);
    await joinEventAsTeam(page, joinCode, "Inspectores E2E");
    await playGeneratedThroughAct2AndFinaleVisual(page, eventId);

    await expect(page.getByTestId("escape-clue-notes")).toContainText(/conserje|vecina|testigo/i);

    await accuseWhodunit(page, culprit);
  });

  test("panel whodunit bloquea acusación sin selección", async ({ browser }) => {
    const page = await browser.newPage();
    await stubMediaRoutes(page);
    await mockCameraForPlaywright(page);
    await clearGameStorage(page);
    await joinEventAsTeam(page, joinCode, "Equipo QA 2");
    await playGeneratedThroughAct2AndFinaleVisual(page, eventId);
    await page.getByTestId("escape-puzzle-tab-case_accusation").click();
    await expect(page.getByTestId("escape-whodunit-submit")).toBeDisabled();
    await page.close();
  });
});