import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { generateAdventureRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import { createJoinCode, MemoryEventStore, validateCreateEvent } from "./event-store.js";
import { startEventSession } from "./events-routes.js";
import { MemorySessionStore } from "./session-store.js";

describe("MVP event flow", () => {
  const saraEvent: CreateEventRequest = {
    adventureType: "birthday",
    teamCount: 5,
    durationMin: 60,
    subject: { name: "Sara García", nickname: "Sara", age: 30 },
    facts: ["Le encanta la playa de La Concha", "Su canción es LUEGO", "Año clave 1995"],
    eventTitle: "Misterio de Sara",
  };

  it("valida y genera sala con duración y datos de Sara", () => {
    const body = { ...saraEvent };
    const err = validateCreateEvent(body);
    expect(err).toBeUndefined();
    const room = generateAdventureRoom(body, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(room.timeLimitSec).toBe(3600);
    expect(room.puzzles.entry_lock.answer).toBe("1995");
    expect(room.name).toContain("Sara");
  });

  it("registra equipos con sesiones independientes", async () => {
    const eventStore = new MemoryEventStore();
    const sessionStore = new MemorySessionStore();
    const room = generateAdventureRoom(saraEvent, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    const joinCode = createJoinCode();
    await eventStore.create({
      eventId: "ev-1",
      joinCode,
      createdAtMs: Date.now(),
      config: saraEvent,
      title: "Misterio de Sara",
      room,
      teams: {},
    });

    async function joinTeam(name: string) {
      const event = (await eventStore.getByCode(joinCode))!;
      const teamId = randomUUID();
      const slot = Object.keys(event.teams).length + 1;
      event.teams[teamId] = {
        teamId,
        teamName: name,
        slot,
        status: "waiting",
        joinedAtMs: Date.now(),
      };
      await eventStore.save(event);
      return startEventSession(joinCode, teamId, eventStore, sessionStore);
    }

    const a = await joinTeam("Equipo Rojo");
    const b = await joinTeam("Equipo Azul");
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect((a.body as { sessionId: string }).sessionId).not.toBe(
      (b.body as { sessionId: string }).sessionId,
    );

    const sessionA = await sessionStore.get((a.body as { sessionId: string }).sessionId);
    expect(sessionA?.playerContext?.displayName).toBe("Equipo Rojo");
  });
});
