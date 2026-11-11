import { generateAdventureRoom, listAdventureTemplates } from "@escapeai/escape-content";
import { createSession, toPublicState, type PlayerContext, type SessionRecord } from "@escapeai/escape-engine";
import type { CreateEventRequest, JoinEventRequest } from "@escapeai/shared";
import { Hono } from "hono";
import { runOrchestrator } from "./orchestrator.js";
import {
  createJoinCode,
  leaderboardFromEvent,
  nextPlayerSlot,
  toEventPreview,
  validateCreateEvent,
  type EventStore,
  type StoredEvent,
} from "./event-store.js";
import type { SessionStore } from "./session-store.js";
import { randomUUID } from "node:crypto";

export function mountEventRoutes(app: Hono, eventStore: EventStore): void {
  app.get("/adventures", (c) => c.json({ templates: listAdventureTemplates() }));

  app.post("/events", async (c) => {
    const body = (await c.req.json<CreateEventRequest>().catch(() => null)) as CreateEventRequest | null;
    if (!body) return c.json({ error: "Cuerpo inválido" }, 400);
    const err = validateCreateEvent(body);
    if (err) return c.json({ error: err }, 400);

    const eventId = randomUUID();
    const room = generateAdventureRoom(body, eventId);
    let event: StoredEvent = {
      eventId,
      joinCode: createJoinCode(),
      createdAtMs: Date.now(),
      config: body,
      title: body.eventTitle?.trim() || room.name,
      room,
      players: {},
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await eventStore.create(event);
        break;
      } catch {
        event = { ...event, joinCode: createJoinCode() };
      }
    }

    return c.json({ preview: toEventPreview(event) }, 201);
  });

  app.get("/events/:code", async (c) => {
    const event = await eventStore.getByCode(c.req.param("code"));
    if (!event) return c.json({ error: "Evento no encontrado" }, 404);
    return c.json({
      preview: toEventPreview(event),
      players: leaderboardFromEvent(event),
    });
  });

  app.post("/events/:code/players", async (c) => {
    const event = await eventStore.getByCode(c.req.param("code"));
    if (!event) return c.json({ error: "Evento no encontrado" }, 404);

    const body = (await c.req.json<JoinEventRequest>().catch(() => null)) as JoinEventRequest | null;
    const displayName = body?.displayName?.trim();
    if (!displayName || displayName.length < 2) {
      return c.json({ error: "Indica tu nombre (mínimo 2 caracteres)." }, 400);
    }

    const slot = nextPlayerSlot(event);
    if (slot === undefined) {
      return c.json({ error: "Cupo completo para este evento." }, 409);
    }

    const playerId = randomUUID();
    event.players[playerId] = {
      playerId,
      displayName,
      slot,
      status: "waiting",
      joinedAtMs: Date.now(),
    };
    await eventStore.save(event);

    return c.json(
      {
        playerId,
        slot,
        joinCode: event.joinCode,
        eventTitle: event.title,
      },
      201,
    );
  });

  app.get("/events/:code/leaderboard", async (c) => {
    const event = await eventStore.getByCode(c.req.param("code"));
    if (!event) return c.json({ error: "Evento no encontrado" }, 404);
    return c.json({
      joinCode: event.joinCode,
      title: event.title,
      players: leaderboardFromEvent(event),
    });
  });
}

export async function startEventSession(
  eventCode: string,
  playerId: string,
  eventStore: EventStore,
  sessionStore: SessionStore,
): Promise<{ status: number; body: unknown }> {
  const event = await eventStore.getByCode(eventCode);
  if (!event) return { status: 404, body: { error: "Evento no encontrado" } };

  const player = event.players[playerId];
  if (!player) return { status: 404, body: { error: "Jugador no registrado en este evento" } };

  if (player.sessionId) {
    const existing = await sessionStore.get(player.sessionId);
    if (existing) {
      return { status: 200, body: { sessionId: existing.sessionId, state: toPublicState(existing) } };
    }
  }

  const playerContext: PlayerContext = {
    displayName: player.displayName,
    eventId: event.eventId,
    playerId,
    joinCode: event.joinCode,
    slot: player.slot,
    eventTitle: event.title,
    adventureType: event.config.adventureType,
  };

  const session = createSession(event.room, playerContext);
  const intro = await runOrchestrator(session, []);
  if (intro.message) session.narrative.push(intro.message);

  player.sessionId = session.sessionId;
  player.status = "playing";
  await sessionStore.set(session);
  await eventStore.save(event);

  return { status: 201, body: { sessionId: session.sessionId, state: toPublicState(session) } };
}

export async function syncPlayerStatusFromSession(
  eventStore: EventStore,
  session: SessionRecord,
): Promise<void> {
  const ctx = session.playerContext;
  if (!ctx?.joinCode) return;
  const event = await eventStore.getByCode(ctx.joinCode);
  if (!event) return;
  const player = event.players[ctx.playerId];
  if (!player || player.sessionId !== session.sessionId) return;

  const elapsed = Math.floor((Date.now() - session.startedAtMs) / 1000);
  player.timeRemainingSec = Math.max(0, session.room.timeLimitSec - elapsed);
  if (session.status === "won") player.status = "won";
  else if (session.status === "lost") player.status = "lost";
  else player.status = "playing";

  await eventStore.save(event);
}
