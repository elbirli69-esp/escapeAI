import { applyAction, createSession } from "@escapeai/escape-engine";
import { generateAdventureRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { MemoryEventStore, createJoinCode } from "./event-store.js";
import { computeSceneProgress } from "./event-milestones.js";
import { syncPlayerStatusFromSession } from "./events-routes.js";

const sampleEvent: CreateEventRequest = {
  adventureType: "birthday",
  teamCount: 4,
  durationMin: 45,
  subject: { name: "Ana", nickname: "Ana", age: 28 },
  facts: ["Le gusta el jazz", "Código 42", "Año 1991"],
  eventTitle: "Fiesta de Ana",
};

describe("event scene milestones", () => {
  it("resume equipos en juego por escena", async () => {
    const room = generateAdventureRoom(sampleEvent, randomUUID());
    const joinCode = createJoinCode();
    const store = new MemoryEventStore();
    const teamA = randomUUID();
    const teamB = randomUUID();
    const sessionA = createSession(room, { displayName: "Rojos" });
    const sessionB = createSession(room, { displayName: "Azules" });
    const lockAnswer = room.puzzles.entry_lock.answer ?? "";
    applyAction(sessionA, { type: "submit_answer", puzzleId: "entry_lock", value: lockAnswer });
    applyAction(sessionA, { type: "move", sceneId: "middle" });

    await store.create({
      eventId: "ev",
      joinCode,
      createdAtMs: Date.now(),
      config: sampleEvent,
      title: "Fiesta",
      room,
      teams: {
        [teamA]: {
          teamId: teamA,
          teamName: "Rojos",
          slot: 1,
          status: "playing",
          joinedAtMs: Date.now(),
          sessionId: sessionA.sessionId,
        },
        [teamB]: {
          teamId: teamB,
          teamName: "Azules",
          slot: 2,
          status: "playing",
          joinedAtMs: Date.now(),
          sessionId: sessionB.sessionId,
        },
      },
    });

    sessionA.playerContext = {
      displayName: "Rojos",
      playerId: teamA,
      joinCode,
      eventId: "ev",
    };
    sessionB.playerContext = {
      displayName: "Azules",
      playerId: teamB,
      joinCode,
      eventId: "ev",
    };

    await syncPlayerStatusFromSession(store, sessionA);
    await syncPlayerStatusFromSession(store, sessionB);

    const event = (await store.getByCode(joinCode))!;
    const { progressSummary, sceneMilestones } = computeSceneProgress(event);
    expect(sceneMilestones.length).toBe(2);
    expect(progressSummary).toMatch(/escena 1/);
    expect(progressSummary).toMatch(/escena 2/);
  });
});
