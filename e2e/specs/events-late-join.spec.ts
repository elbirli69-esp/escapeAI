import { test, expect } from "@playwright/test";
import { generateAdventureRoom } from "@escapeai/escape-content";

const apiBase = "http://127.0.0.1:8787/api";

const eventInput = {
  adventureType: "birthday" as const,
  teamCount: 2,
  durationMin: 45 as const,
  hybridPlayMode: "mobile_only" as const,
  subject: { name: "Luna Pérez", nickname: "Luna" },
  facts: ["Le gusta el jazz", "Año 1990"],
  eventTitle: "Late join E2E",
};

test.describe.serial("events late join and inventory isolation", () => {
  let joinCode: string;
  let eventId: string;
  let teamEarlyId: string;
  let teamLateId: string;
  let sessionEarlyId: string;
  let sessionLateId: string;

  test("crear evento multiequipo", async ({ request }) => {
    const res = await request.post(`${apiBase}/events`, { data: eventInput });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { preview: { joinCode: string; eventId: string } };
    joinCode = body.preview.joinCode;
    eventId = body.preview.eventId;
  });

  test("equipo temprano avanza; equipo que entra tarde no hereda inventario", async ({ request }) => {
    const joinEarly = await request.post(`${apiBase}/events/${joinCode}/teams`, {
      data: { displayName: "Equipo Temprano" },
    });
    const joinLate = await request.post(`${apiBase}/events/${joinCode}/teams`, {
      data: { displayName: "Equipo Tardío" },
    });
    expect(joinEarly.ok()).toBeTruthy();
    expect(joinLate.ok()).toBeTruthy();
    teamEarlyId = ((await joinEarly.json()) as { teamId: string }).teamId;
    teamLateId = ((await joinLate.json()) as { teamId: string }).teamId;
    expect(teamEarlyId).not.toBe(teamLateId);

    const startEarly = await request.post(`${apiBase}/sessions`, {
      data: { eventCode: joinCode, teamId: teamEarlyId },
    });
    expect(startEarly.ok()).toBeTruthy();
    sessionEarlyId = ((await startEarly.json()) as { sessionId: string }).sessionId;

    const room = generateAdventureRoom(eventInput, eventId);
    const sound = room.puzzles.sound_intro!.answer!;
    const entry = room.puzzles.entry_lock!.answer!;

    const listen = await request.post(`${apiBase}/sessions/${sessionEarlyId}/actions`, {
      data: { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" },
    });
    expect(listen.ok()).toBeTruthy();

    await request.post(`${apiBase}/sessions/${sessionEarlyId}/actions`, {
      data: { type: "submit_answer", puzzleId: "sound_intro", value: sound },
    });
    await request.post(`${apiBase}/sessions/${sessionEarlyId}/actions`, {
      data: { type: "submit_answer", puzzleId: "entry_lock", value: entry },
    });
    await request.post(`${apiBase}/sessions/${sessionEarlyId}/actions`, {
      data: { type: "move", sceneId: "middle" },
    });

    const takeToken = await request.post(`${apiBase}/sessions/${sessionEarlyId}/actions`, {
      data: { type: "take_item", itemId: "token" },
    });
    expect(takeToken.ok()).toBeTruthy();
    const stateEarly = (await takeToken.json()) as { state: { inventory: string[] } };
    expect(stateEarly.state.inventory).toContain("token");

    const startLate = await request.post(`${apiBase}/sessions`, {
      data: { eventCode: joinCode, teamId: teamLateId },
    });
    expect(startLate.ok()).toBeTruthy();
    sessionLateId = ((await startLate.json()) as { sessionId: string }).sessionId;

    const stateLateRes = await request.get(`${apiBase}/sessions/${sessionLateId}`);
    expect(stateLateRes.ok()).toBeTruthy();
    const stateLate = (await stateLateRes.json()) as {
      state: { inventory: string[]; currentSceneId: string };
    };
    expect(stateLate.state.inventory).not.toContain("token");
    expect(stateLate.state.currentSceneId).toBe("start");

    const stealToken = await request.post(`${apiBase}/sessions/${sessionLateId}/actions`, {
      data: { type: "take_item", itemId: "token" },
    });
    const stealBody = (await stealToken.json()) as { ok: boolean };
    expect(stealBody.ok).toBe(false);
  });
});