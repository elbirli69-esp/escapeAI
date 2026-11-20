import { test, expect } from "@playwright/test";
import { generateAdventureRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import {
  ADA_CELEBRATION_EVENT,
  ADA_MYSTERY_EVENT,
  ADA_TEAM_EVENT,
  createEventViaRequest,
} from "../fixtures/events-api.js";

const apiBase = "http://127.0.0.1:8787/api";

const SERIAL_PRESETS: Array<{ label: string; input: CreateEventRequest }> = [
  { label: "mystery", input: ADA_MYSTERY_EVENT },
  { label: "team", input: ADA_TEAM_EVENT },
  { label: "celebration", input: ADA_CELEBRATION_EVENT },
];

test.describe.serial("custom adventure types — API replay", () => {
  for (const preset of SERIAL_PRESETS) {
    test(`${preset.label} — create, join, entry_lock`, async ({ request }) => {
      test.setTimeout(90_000);
      const { joinCode, eventId } = await createEventViaRequest(request, preset.input);
      const joinTeam = await request.post(`${apiBase}/events/${joinCode}/teams`, {
        data: { displayName: `Serial ${preset.label}` },
      });
      expect(joinTeam.ok()).toBeTruthy();
      const teamId = ((await joinTeam.json()) as { teamId: string }).teamId;

      const startSession = await request.post(`${apiBase}/sessions`, {
        data: { eventCode: joinCode, teamId },
      });
      expect(startSession.ok()).toBeTruthy();
      const sessionId = ((await startSession.json()) as { sessionId: string }).sessionId;

      const room = generateAdventureRoom(preset.input, eventId);
      const sound = String(room.puzzles.sound_intro?.answer ?? "");
      const entry = String(room.puzzles.entry_lock?.answer ?? "");
      expect(sound.length).toBeGreaterThan(0);
      expect(entry.length).toBeGreaterThan(0);

      const listen = await request.post(`${apiBase}/sessions/${sessionId}/actions`, {
        data: { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" },
      });
      expect(listen.ok()).toBeTruthy();

      const soundAns = await request.post(`${apiBase}/sessions/${sessionId}/actions`, {
        data: { type: "submit_answer", puzzleId: "sound_intro", value: sound },
      });
      expect(soundAns.ok()).toBeTruthy();
      const soundBody = (await soundAns.json()) as { events?: Array<{ type: string; puzzleId?: string }> };
      expect(soundBody.events?.some((e) => e.type === "puzzle_solved" && e.puzzleId === "sound_intro")).toBe(
        true,
      );

      const entryAns = await request.post(`${apiBase}/sessions/${sessionId}/actions`, {
        data: { type: "submit_answer", puzzleId: "entry_lock", value: entry },
      });
      expect(entryAns.ok()).toBeTruthy();
      const entryBody = (await entryAns.json()) as {
        events?: Array<{ type: string; puzzleId?: string }>;
        state?: { puzzles?: Array<{ id: string; solved: boolean }> };
      };
      expect(
        entryBody.events?.some((e) => e.type === "puzzle_solved" && e.puzzleId === "entry_lock"),
      ).toBe(true);

      const entryPuzzle = entryBody.state?.puzzles?.find((p) => p.id === "entry_lock");
      expect(entryPuzzle?.solved).toBe(true);
    });
  }
});