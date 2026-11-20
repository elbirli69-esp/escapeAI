import { test, expect, type Page } from "@playwright/test";
import {
  clearGameStorage,
  moveToScene,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import {
  expectPuzzleSolvedMark,
  inferPedestalOso,
  readNarrativeLog,
  requestHintsUntil,
} from "../fixtures/blind-playtest.js";
import { appendPlaytestGrupoRun } from "../fixtures/playtest-grupo-io.js";

const KM0 = { latitude: 40.4169, longitude: -3.7035 };

async function confirmGeoLocation(page: Page): Promise<void> {
  await page
    .locator(".location-station")
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await page.getByRole("button", { name: "Estoy aquí" }).click();
  await expect(page.locator("main.shell.game")).toHaveAttribute("aria-busy", "false", {
    timeout: 30_000,
  });
}

test.describe("playtest blind geo-lab (Fase D)", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(KM0);
    await clearGameStorage(page);
  });

  test("eq-experto — GPS demo y placa del oso", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: string[] = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "geo-lab");

    await selectPuzzle(page, "llegar_sol");
    await confirmGeoLocation(page);
    await expect(page.getByTestId("escape-exit-plaza_clue")).toBeEnabled({ timeout: 15_000 });
    evidence.push("llegar_sol con GPS mock (UI)");

    await moveToScene(page, "plaza_clue");
    const plazaCopy = await page.locator("main.game").innerText();

    await selectPuzzle(page, "pedestal_code");
    await submitAnswer(page, "CAT");
    wrongAttempts += 1;
    const pedestalHints = await requestHintsUntil(page, 2);
    const code =
      inferPedestalOso(plazaCopy) ??
      inferPedestalOso(pedestalHints.logText) ??
      inferPedestalOso(await readNarrativeLog(page));
    expect(code).toBe("OSO");
    await submitAnswer(page, code!);
    await expectPuzzleSolvedMark(page, "pedestal_code");
    evidence.push("pedestal_code desde escena / pistas");

    await expect(page.getByTestId("escape-exit-galeria_rally")).toBeEnabled({
      timeout: 15_000,
    });
    evidence.push("galeria_rally accesible");

    appendPlaytestGrupoRun({
      roomId: "geo-lab",
      eventId: null,
      adventureType: null,
      teamId: "eq-experto",
      teamSize: 4,
      teamProfile: "Veteranos — rally GPS acto 1",
      executionMode: "exploratory",
      won: false,
      partialWin: true,
      wrongAttempts,
      hintDependency: wrongAttempts > 0,
      perceivedProgress: 7,
      difficultyScore: 7,
      hintsScore: 7.5,
      llmStatus: "no_configurado",
      evidence,
      limitations: ["Sin quiz final ni galería completa en corrida ciega."],
    });
  });
});