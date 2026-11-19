import { test, expect } from "@playwright/test";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { completeSoundListen, moveToScene, selectPuzzle, submitAnswer } from "../fixtures/game.js";

const apiBase = "http://127.0.0.1:8787/api";

const eventInput = {
  adventureType: "team" as const,
  teamCount: 2,
  durationMin: 45 as const,
  hybridPlayMode: "mobile_only" as const,
  asymmetricRoles: true,
  subject: { name: "Laboratorio Norte", nickname: "LN" },
  facts: ["Ensayo 2024", "Muestra B7"],
  eventTitle: "Cura E2E",
};

async function playAct1(page: import("@playwright/test").Page, entry: string, sound: string) {
  await selectPuzzle(page, "sound_intro");
  await completeSoundListen(page);
  await submitAnswer(page, sound);
  await selectPuzzle(page, "entry_lock");
  await submitAnswer(page, entry);
  await moveToScene(page, "middle");
}

async function openSession(page: import("@playwright/test").Page, sessionId: string) {
  await page.addInitScript((id) => {
    localStorage.setItem("escapeai.sessionId", id);
    sessionStorage.setItem("escapeai.autoResume", "1");
  }, sessionId);
  await page.goto("/");
  await page.getByTestId(/escape-puzzle-tab-/).first().waitFor({ timeout: 30_000 });
}

test.describe.serial("P6-B roles asimétricos", () => {
  test.describe.configure({ timeout: 180_000 });

  let joinCode: string;
  let eventId: string;
  let teamId: string;
  let answers: {
    sound: string;
    entry: string;
    lab: string;
    field: string;
    fusion: string;
  };

  test("crear evento team con roles asimétricos", async ({ request }) => {
    const res = await request.post(`${apiBase}/events`, { data: eventInput });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { preview: { joinCode: string; eventId: string } };
    joinCode = body.preview.joinCode;
    eventId = body.preview.eventId;
    const room = generateAdventureRoom(eventInput, eventId);
    answers = {
      sound: room.puzzles.sound_intro!.answer!,
      entry: room.puzzles.entry_lock!.answer!,
      lab: room.puzzles.role_research_vial!.answer!,
      field: room.puzzles.role_field_sample!.answer!,
      fusion: room.puzzles.coop_serum!.answer!,
    };
  });

  test("dos dispositivos: cada rol resuelve su candado y fusionan", async ({ browser, request }) => {
    const joinRes = await request.post(`${apiBase}/events/${joinCode}/teams`, {
      data: { displayName: "Equipo Cura" },
    });
    expect(joinRes.ok()).toBeTruthy();
    teamId = ((await joinRes.json()) as { teamId: string }).teamId;

    const startLab = await request.post(`${apiBase}/sessions`, {
      data: { eventCode: joinCode, teamId, playerRole: "researcher" },
    });
    const startField = await request.post(`${apiBase}/sessions`, {
      data: { eventCode: joinCode, teamId, playerRole: "field" },
    });
    expect(startLab.ok()).toBeTruthy();
    expect(startField.ok()).toBeTruthy();

    const labBody = (await startLab.json()) as { sessionId: string; state: { playerRole?: string } };
    const fieldBody = (await startField.json()) as { sessionId: string; state: { playerRole?: string } };
    expect(labBody.state.playerRole).toBe("researcher");
    expect(fieldBody.state.playerRole).toBe("field");

    const ctxLab = await browser.newContext();
    const ctxField = await browser.newContext();
    const pageLab = await ctxLab.newPage();
    const pageField = await ctxField.newPage();

    await openSession(pageLab, labBody.sessionId);
    await openSession(pageField, fieldBody.sessionId);

    await pageLab.getByTestId("escape-player-role-banner").waitFor();
    await pageField.getByTestId("escape-player-role-banner").waitFor();
    await expect(pageLab.getByTestId("escape-puzzle-tab-role_field_sample")).toBeHidden();
    await expect(pageField.getByTestId("escape-puzzle-tab-role_research_vial")).toBeHidden();

    await playAct1(pageLab, answers.entry, answers.sound);
    await playAct1(pageField, answers.entry, answers.sound);

    await selectPuzzle(pageLab, "role_research_vial");
    await submitAnswer(pageLab, answers.lab);

    const earlyFusion = await request.post(`${apiBase}/sessions/${labBody.sessionId}/actions`, {
      data: { type: "submit_answer", puzzleId: "coop_serum", value: answers.fusion },
    });
    const earlyBody = (await earlyFusion.json()) as { ok: boolean; error?: string };
    expect(earlyBody.ok).toBe(false);
    expect(earlyBody.error).toMatch(/pistas del equipo/i);

    await selectPuzzle(pageField, "role_field_sample");
    await submitAnswer(pageField, answers.field);
    await pageField.waitForTimeout(500);

    await selectPuzzle(pageLab, "coop_serum");
    await submitAnswer(pageLab, answers.fusion);

    const labAfter = (await request.get(`${apiBase}/sessions/${labBody.sessionId}`)).json() as Promise<{
      state: { puzzles: Array<{ id: string; solved: boolean }>; clueNotes?: Array<{ id: string }> };
    }>;
    const fieldAfter = (await request.get(`${apiBase}/sessions/${fieldBody.sessionId}`)).json() as Promise<{
      state: { clueNotes?: Array<{ id: string }> };
    }>;
    const labJson = await labAfter;
    const fieldJson = await fieldAfter;
    expect(labJson.state.puzzles.find((p) => p.id === "coop_serum")?.solved).toBe(true);
    const fieldClueIds = (fieldJson.state.clueNotes ?? []).map((c) => c.id);
    expect(fieldClueIds).toContain("role_lab_seq");

    await ctxLab.close();
    await ctxField.close();
  });
});