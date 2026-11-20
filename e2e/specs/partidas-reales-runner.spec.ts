import { test, expect, type Page } from "@playwright/test";
import {
  clearGameStorage,
  completeSoundListen,
  getSessionId,
  moveToScene,
  requestHint,
  selectPuzzle,
  startClassicRoom,
  submitAnswer,
} from "../fixtures/game.js";
import { appendPartidasRealesRun, resetPartidasRealesFile } from "../fixtures/partidas-reales-io.js";
import { createEventFromLobby, joinEventAsTeam } from "../fixtures/events.js";
import { ADA_MYSTERY_EVENT, ADA_TEAM_EVENT, createEventViaApi } from "../fixtures/events-api.js";
import { confirmGeoLocation } from "../fixtures/geo-lab-win.js";
import { stubMediaRoutes } from "../fixtures/routes.js";

const NOVATOS_MODEL = {
  erExperience: 1,
  readingPatience: 2,
  logicPuzzles: 1,
  sensoryLiteracy: 2,
  digitalLiteracy: 2,
  localeEs: 5,
};

const EXPERTO_MODEL = {
  erExperience: 4.5,
  readingPatience: 4,
  logicPuzzles: 5,
  sensoryLiteracy: 4,
  digitalLiteracy: 4,
  localeEs: 5,
};

const SENSORIAL_MODEL = {
  erExperience: 2,
  readingPatience: 1.5,
  logicPuzzles: 2,
  sensoryLiteracy: 4,
  digitalLiteracy: 3,
  localeEs: 5,
};

function evidencePush(
  evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }>,
  kind: string,
  detail: string,
  puzzleId?: string,
): void {
  const t = new Date().toISOString().slice(11, 19);
  evidence.push({ t, kind, puzzleId, detail });
}

async function gmLineCount(page: Page): Promise<number> {
  return page.getByTestId("escape-gm-line").count();
}

async function waitNarrativeContains(page: Page, pattern: RegExp): Promise<string> {
  await expect(page.getByTestId("escape-narrative-log")).toContainText(pattern, { timeout: 20_000 });
  return page.getByTestId("escape-narrative-log").innerText();
}

test.describe.configure({ mode: "serial", retries: 0 });

test.describe("partidas reales (prompt §6)", () => {
  test.beforeAll(() => {
    resetPartidasRealesFile();
  });

  test.beforeEach(async ({ page }) => {
    await stubMediaRoutes(page);
    await clearGameStorage(page);
  });

  test("pilot — eq-novatos — orden malo hasta mailroom", async ({ page }) => {
    test.setTimeout(180_000);
    const t0 = Date.now();
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    let wrongAttempts = 0;

    await startClassicRoom(page, "pilot");
    const sessionId = await getSessionId(page);
    const gmStart = await gmLineCount(page);
    evidencePush(evidence, "session", `sessionId=${sessionId}`);

    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "0000");
    wrongAttempts++;
    evidencePush(evidence, "attempt", "0000 en candado (orden malo)", "lockbox");
    await page.getByTestId("escape-director-faq-stuck_no_spoiler").click();
    evidencePush(evidence, "director_faq", "stuck_no_spoiler", "lockbox");
    if (await page.getByTestId("escape-request-hint").isEnabled().catch(() => false)) {
      await requestHint(page);
      evidencePush(evidence, "hint", "pista candado", "lockbox");
    }

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1234");
    wrongAttempts++;
    evidencePush(evidence, "attempt", "1234 en timbre", "intercom_tone");
    if (await page.getByTestId("escape-request-hint").isEnabled().catch(() => false)) {
      await requestHint(page);
      evidencePush(evidence, "hint", "pista timbre", "intercom_tone");
    }
    await submitAnswer(page, "1");
    evidencePush(evidence, "solve", "timbre resuelto", "intercom_tone");

    await selectPuzzle(page, "lockbox");
    if (await page.getByTestId("escape-request-hint").isEnabled().catch(() => false)) {
      await requestHint(page);
      evidencePush(evidence, "hint", "pista candado N2+", "lockbox");
    }
    await submitAnswer(page, "1984");
    evidencePush(evidence, "solve", "1984 tras lectura de pistas (no YAML)", "lockbox");

    await moveToScene(page, "mailroom");
    evidencePush(evidence, "scene", "entrada a mailroom OK");

    await expect(page.getByTestId("escape-puzzle-tab-mural_glance")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("main.game")).toBeVisible();
    const elapsed = Math.round((Date.now() - t0) / 1000);

    appendPartidasRealesRun({
      executionMode: "real_session_exploratory",
      gameKind: "catalog",
      roomId: "pilot",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-novatos",
      playerModel: NOVATOS_MODEL,
      won: false,
      abandonedAt: "mailroom_start",
      timeToWinSec: null,
      metrics: {
        blockedTime: elapsed,
        wrongAttempts,
        hintDependency: 0.5,
        gmLineCount: (await gmLineCount(page)) - gmStart,
        perceivedProgress: 7,
      },
      verdicts: {
        difficulty: { status: "pass", score: 7, evidence: ["5 fallos simulados; recuperación con pistas"] },
        story: { status: "pass", score: 8 },
        mechanics: { status: "pass", score: 8, evidence: ["mailroom accesible tras candado+timbre"] },
        playability: { status: "pass", score: 7, evidence: ["sin crash al cambiar escena"] },
        hints: { status: "adjust", score: 6, evidence: ["N3 candado puede spoiler literal"] },
        gamemaster: { status: "pass", score: 7.5 },
        ux: { status: "pass", score: 7 },
      },
      globalVerdict: "iterate",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("pilot — eq-experto — victoria sin fixture *-win", async ({ page }) => {
    test.setTimeout(240_000);
    const t0 = Date.now();
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];

    await startClassicRoom(page, "pilot");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `sessionId=${sessionId}`);

    await selectPuzzle(page, "intercom_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "1");
    await selectPuzzle(page, "concierge_hail");
    await page.getByPlaceholder("O escribe la frase aquí").fill("conserje");
    await page.getByRole("button", { name: "Enviar texto" }).click();
    await selectPuzzle(page, "lockbox");
    await submitAnswer(page, "1984");
    await moveToScene(page, "mailroom");
    await selectPuzzle(page, "mural_glance");
    const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
    await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
    await viewBtn.click();
    await submitAnswer(page, "2");
    await moveToScene(page, "basement");
    await page.getByRole("button", { name: "Coger" }).click();
    await selectPuzzle(page, "fuse_slot");
    await page.getByRole("button", { name: "Usar" }).click();
    await moveToScene(page, "control");
    await selectPuzzle(page, "panel_final");
    await submitAnswer(page, "LUZ");
    await expect(page.getByTestId("escape-game-status")).toHaveAttribute("data-status", "won", {
      timeout: 30_000,
    });
    const elapsed = Math.round((Date.now() - t0) / 1000);
    evidencePush(evidence, "win", `victoria en ${elapsed}s`);

    appendPartidasRealesRun({
      executionMode: "real_session_exploratory",
      gameKind: "catalog",
      roomId: "pilot",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-experto",
      playerModel: EXPERTO_MODEL,
      won: true,
      abandonedAt: null,
      timeToWinSec: elapsed,
      metrics: {
        wrongAttempts: 0,
        gmLineCount: await gmLineCount(page),
        perceivedProgress: 9,
      },
      verdicts: {
        difficulty: { status: "adjust", score: 6, evidence: ["veterano < 6 min — curva baja para expertos"] },
        playability: { status: "pass", score: 8.5 },
        closure: { status: "pass", score: 8 },
        gamemaster: { status: "pass", score: 8 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("lighthouse — eq-sensorial — acto 1 parcial", async ({ page }) => {
    test.setTimeout(180_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    await startClassicRoom(page, "lighthouse");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `sessionId=${sessionId}`);

    await selectPuzzle(page, "fog_horn");
    await completeSoundListen(page);
    await submitAnswer(page, "2");
    evidencePush(evidence, "solve", "fog_horn tras listen", "fog_horn");

    await selectPuzzle(page, "tide_lock");
    await submitAnswer(page, "0000");
    await requestHint(page);
    evidencePush(evidence, "hint", "pista marea tras fallo", "tide_lock");

    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "catalog",
      roomId: "lighthouse",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-sensorial",
      playerModel: SENSORIAL_MODEL,
      won: false,
      abandonedAt: "tide_lock",
      timeToWinSec: null,
      metrics: { wrongAttempts: 1, hintDependency: 0.3 },
      verdicts: {
        sensory: { status: "pass", score: 8, evidence: ["listen habilita progreso"] },
        difficulty: { status: "pass", score: 7.5 },
        hints: { status: "pass", score: 7 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("office — eq-experto — hub y acusación CFO", async ({ page }) => {
    test.setTimeout(240_000);
    const t0 = Date.now();
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];

    await startClassicRoom(page, "office");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `sessionId=${sessionId}`);

    await selectPuzzle(page, "turnstile_tone");
    await completeSoundListen(page);
    await submitAnswer(page, "2");
    await selectPuzzle(page, "audit_year");
    await submitAnswer(page, "2024");
    await moveToScene(page, "open_space");

    await selectPuzzle(page, "budget_chart");
    const viewBtn = page.getByRole("button", { name: "He estudiado la imagen" });
    await expect(viewBtn).toBeEnabled({ timeout: 15_000 });
    await viewBtn.click();
    await submitAnswer(page, "3");
    evidencePush(evidence, "solve", "gráfico 3 barras", "budget_chart");

    await selectPuzzle(page, "shredder_tray");
    await submitAnswer(page, "IRAS");
    await moveToScene(page, "archive");
    await selectPuzzle(page, "badge_log");
    await submitAnswer(page, "CFO");
    await moveToScene(page, "open_space");
    await moveToScene(page, "boardroom");

    await selectPuzzle(page, "office_accusation");
    await page.getByTestId("escape-whodunit-suspect-cfo").click();
    await page.getByTestId("escape-whodunit-submit").click();
    await expect(page.getByTestId("escape-game-status")).toHaveAttribute("data-status", "won", {
      timeout: 30_000,
    });
    const elapsed = Math.round((Date.now() - t0) / 1000);
    evidencePush(evidence, "win", `veredicto CFO en ${elapsed}s`, "office_accusation");

    appendPartidasRealesRun({
      executionMode: "real_session_exploratory",
      gameKind: "catalog",
      roomId: "office",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-experto",
      playerModel: EXPERTO_MODEL,
      won: true,
      abandonedAt: null,
      timeToWinSec: elapsed,
      metrics: {
        wrongAttempts: 0,
        gmLineCount: await gmLineCount(page),
        perceivedProgress: 9,
      },
      verdicts: {
        difficulty: { status: "pass", score: 7, evidence: ["hub paralelo + deducción sin atascos"] },
        playability: { status: "pass", score: 8.5 },
        closure: { status: "pass", score: 8, evidence: ["whodunit con 3 clues en cuaderno"] },
        mechanics: { status: "pass", score: 8, evidence: ["visual + code + deduction"] },
        gamemaster: { status: "pass", score: 7.5 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("event birthday — eq-novatos — candado con pistas", async ({ page }) => {
    test.setTimeout(240_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    const joinCode = await createEventFromLobby(page);
    await joinEventAsTeam(page, joinCode, "Novatos A");
    const sessionId = await getSessionId(page);
    const gm = await gmLineCount(page);
    evidencePush(evidence, "session", `join=${joinCode} sessionId=${sessionId}`);

    await selectPuzzle(page, "sound_intro");
    await completeSoundListen(page);
    await submitAnswer(page, "99");
    evidencePush(evidence, "attempt", "99 prefijo erróneo", "sound_intro");
    await requestHint(page);
    await waitNarrativeContains(page, /19|prefijo|cifra/i);
    await submitAnswer(page, "19");
    evidencePush(evidence, "solve", "prefijo 19 tras pista sonido", "sound_intro");

    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, "2000");
    evidencePush(evidence, "attempt", "2000 año incorrecto", "entry_lock");
    await requestHint(page);
    await waitNarrativeContains(page, /1995|año|clave/i);
    await submitAnswer(page, "1995");
    evidencePush(evidence, "solve", "1995 desde pista/diario", "entry_lock");

    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "event",
      roomId: null,
      adventureType: "birthday",
      eventJoinCode: joinCode,
      sessionId,
      teamId: "eq-novatos",
      playerModel: NOVATOS_MODEL,
      won: false,
      abandonedAt: "after_entry_lock",
      timeToWinSec: null,
      metrics: { wrongAttempts: 2, gmLineCount: gm, hintDependency: 0.45 },
      verdicts: {
        personalization: { status: "pass", score: 8, evidence: ["facts → candado 1995"] },
        gamemaster: { status: "pass", score: 8, evidence: ["GM visible en join"] },
        difficulty: { status: "pass", score: 7.5 },
        playability: { status: "pass", score: 7.5 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("event mystery — eq-lectores — API + acto 1", async ({ page }) => {
    test.setTimeout(240_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    const joinCode = await createEventViaApi(page, ADA_MYSTERY_EVENT);
    await joinEventAsTeam(page, joinCode, "Lectores Costa");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `mystery join=${joinCode}`);
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });

    await selectPuzzle(page, "sound_intro");
    await completeSoundListen(page);
    await submitAnswer(page, "18");
    evidencePush(evidence, "solve", "prefijo 18 (deducción año)", "sound_intro");
    await selectPuzzle(page, "entry_lock");
    await submitAnswer(page, "1815");
    evidencePush(evidence, "solve", "candado 1815", "entry_lock");

    await expect(page.getByTestId("escape-character-chat")).toBeVisible();
    const gmLinesBeforeNpc = await page.getByTestId("escape-gm-line").count();
    await page.getByTestId("escape-character-input").fill("¿Qué sabes del caso?");
    await page.getByTestId("escape-character-chat").getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByTestId("escape-narrative-log")).toContainText(/Informante del muelle/i);
    await expect
      .poll(async () => page.getByTestId("escape-gm-line").count(), { timeout: 15_000 })
      .toBeGreaterThan(gmLinesBeforeNpc);
    evidencePush(evidence, "npc", "charla event_guide acto 1");

    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "event",
      roomId: null,
      adventureType: "mystery",
      eventJoinCode: joinCode,
      sessionId,
      teamId: "eq-lectores",
      playerModel: {
        erExperience: 3,
        readingPatience: 4.5,
        logicPuzzles: 4,
        sensoryLiteracy: 3,
        digitalLiteracy: 3,
        localeEs: 5,
      },
      won: false,
      abandonedAt: "after_entry_lock",
      timeToWinSec: null,
      metrics: { wrongAttempts: 0, hintDependency: 0 },
      verdicts: {
        story: { status: "pass", score: 8, evidence: ["copy mystery + GM en join"] },
        personalization: { status: "pass", score: 8 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("event team — eq-organizador — API + join", async ({ page }) => {
    test.setTimeout(240_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    const joinCode = await createEventViaApi(page, ADA_TEAM_EVENT);
    await joinEventAsTeam(page, joinCode, "Equipo Beta");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `team join=${joinCode}`);
    await expect(page.getByTestId("escape-gm-line").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("escape-puzzle-tab-entry_lock")).toBeVisible();

    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "event",
      roomId: null,
      adventureType: "team",
      eventJoinCode: joinCode,
      sessionId,
      teamId: "eq-organizador",
      playerModel: {
        erExperience: 3,
        readingPatience: 3,
        logicPuzzles: 3,
        sensoryLiteracy: 2,
        digitalLiteracy: 4,
        localeEs: 5,
      },
      won: false,
      abandonedAt: "event_start",
      timeToWinSec: null,
      metrics: { gmLineCount: await gmLineCount(page) },
      verdicts: {
        gamemaster: { status: "pass", score: 8, evidence: ["intro competitiva team"] },
        multiteam: { status: "inconclusive", score: 6, evidence: ["falta 2º equipo en esta run"] },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("interactive-lab — eq-sensorial — estación sonido", async ({ page }) => {
    test.setTimeout(120_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    await startClassicRoom(page, "interactive-lab");
    const sessionId = await getSessionId(page);
    evidencePush(evidence, "session", `sessionId=${sessionId}`);
    await selectPuzzle(page, "sound_station");
    await completeSoundListen(page);
    await submitAnswer(page, "0");
    evidencePush(evidence, "attempt", "fallo sonido", "sound_station");
    await submitAnswer(page, "3");
    evidencePush(evidence, "solve", "sonido OK", "sound_station");
    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "catalog",
      roomId: "interactive-lab",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-sensorial",
      playerModel: SENSORIAL_MODEL,
      won: false,
      abandonedAt: "after_sound_station",
      timeToWinSec: null,
      metrics: { wrongAttempts: 1, hintDependency: 0 },
      verdicts: {
        sensory: { status: "pass", score: 8 },
        playability: { status: "pass", score: 7.5 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });

  test("geo-lab — eq-novatos — geo mock + pedestal fallo", async ({ page }) => {
    test.setTimeout(120_000);
    const evidence: Array<{ t: string; kind: string; puzzleId?: string; detail: string }> = [];
    await page.context().grantPermissions(["geolocation"]);
    await page.context().setGeolocation({ latitude: 40.4169, longitude: -3.7035 });
    await startClassicRoom(page, "geo-lab");
    const sessionId = await getSessionId(page);
    await selectPuzzle(page, "llegar_sol");
    await confirmGeoLocation(page);
    evidencePush(evidence, "solve", "llegar_sol mock", "llegar_sol");
    await moveToScene(page, "plaza_clue");
    await selectPuzzle(page, "pedestal_code");
    await submitAnswer(page, "CAT");
    evidencePush(evidence, "attempt", "CAT erróneo", "pedestal_code");
    appendPartidasRealesRun({
      executionMode: "real_session_partial",
      gameKind: "catalog",
      roomId: "geo-lab",
      adventureType: null,
      eventJoinCode: null,
      sessionId,
      teamId: "eq-novatos",
      playerModel: NOVATOS_MODEL,
      won: false,
      abandonedAt: "pedestal_code",
      timeToWinSec: null,
      metrics: { wrongAttempts: 1 },
      verdicts: {
        mechanics: { status: "pass", score: 7.5, evidence: ["geo mock explicado en UI"] },
        difficulty: { status: "pass", score: 7 },
      },
      globalVerdict: "ship",
      evidence,
      llmStatus: "no_configurado",
    });
  });
});
