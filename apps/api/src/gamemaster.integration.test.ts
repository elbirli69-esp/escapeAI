import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { createSession, applyAction, getExitAvailability } from "@escapeai/escape-engine";
import { randomUUID } from "node:crypto";
import { createJoinCode, MemoryEventStore } from "./event-store.js";
import { startEventSession } from "./events-routes.js";
import { MemoryGmInterventionStore, GameMasterService } from "./gamemaster/index.js";
import { MemorySessionStore } from "./session-store.js";

describe("GameMaster integration multiplayer", () => {
  const saraEvent = {
    adventureType: "birthday" as const,
    teamCount: 5,
    durationMin: 60 as const,
    subject: { name: "Sara García", nickname: "Sara", age: 30 },
    facts: ["playa", "LUEGO", "1995"],
    eventTitle: "Misterio de Sara",
  };

  it("cinco equipos con intervenciones GM aisladas", async () => {
    const eventStore = new MemoryEventStore();
    const sessionStore = new MemorySessionStore();
    const gmStore = new MemoryGmInterventionStore();
    const gm = new GameMasterService(gmStore);
    const room = generateAdventureRoom(saraEvent, randomUUID());
    const joinCode = createJoinCode();
    await eventStore.create({
      eventId: "ev-sara",
      joinCode,
      createdAtMs: Date.now(),
      config: saraEvent,
      title: "Misterio de Sara",
      room,
      teams: {},
    });

    const sessionIds: string[] = [];
    for (const name of ["A", "B", "C", "D", "E"]) {
      const teamId = randomUUID();
      const event = (await eventStore.getByCode(joinCode))!;
      event.teams[teamId] = {
        teamId,
        teamName: `Equipo ${name}`,
        slot: Object.keys(event.teams).length + 1,
        status: "waiting",
        joinedAtMs: Date.now(),
      };
      await eventStore.save(event);
      const started = await startEventSession(joinCode, teamId, eventStore, sessionStore, gm);
      expect(started.status).toBe(201);
      sessionIds.push((started.body as { sessionId: string }).sessionId);
    }

    expect(new Set(sessionIds).size).toBe(5);

    for (const id of sessionIds) {
      const session = (await sessionStore.get(id))!;
      const list = await gm.listInterventions(id);
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].text).toContain(session.playerContext?.displayName);
      expect(list.every((i) => i.sessionId === id)).toBe(true);
    }

    const allTexts = await Promise.all(sessionIds.map((id) => gm.listInterventions(id)));
    const flat = allTexts.flat().map((i) => i.text);
    expect(flat.filter((t) => t.includes("Equipo A")).length).toBeGreaterThan(0);
    expect(flat.filter((t) => t.includes("Equipo B")).length).toBeGreaterThan(0);
    const crossLeak = flat.some((t) => t.includes("Equipo A") && t.includes("Equipo B"));
    expect(crossLeak).toBe(false);
  });

  it("gameplay correcto sin proveedor LLM", async () => {
    const room = generateAdventureRoom(saraEvent, randomUUID());
    const session = createSession(room);
    const gm = new GameMasterService(new MemoryGmInterventionStore());
    const before = getExitAvailability(session);
    const result = applyAction(session, {
      type: "submit_answer",
      puzzleId: "entry_lock",
      value: "0000",
    });
    expect(result.events.some((e) => e.type === "puzzle_failed")).toBe(true);
    expect(session.solvedPuzzles.has("entry_lock")).toBe(false);
    await gm.processAfterAction({
      session,
      action: { type: "submit_answer", puzzleId: "entry_lock", value: "0000" },
      events: result.events,
      beforeExits: before,
    });
    expect(session.solvedPuzzles.has("entry_lock")).toBe(false);
  });
});
