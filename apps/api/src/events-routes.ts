import { generateAdventureRoom, listAdventureTemplates } from "@escapeai/escape-content";
import { createSession, toPublicState, type PlayerContext, type SessionRecord } from "@escapeai/escape-engine";
import type { CreateEventRequest, JoinEventRequest } from "@escapeai/shared";
import { Hono } from "hono";
import { buildSessionView, type GameMasterService } from "./gamemaster/index.js";
import {
  createJoinCode,
  leaderboardFromEvent,
  migrateLegacyEvent,
  nextTeamSlot,
  toEventPreview,
  validateCreateEvent,
  type EventStore,
  type StoredEvent,
} from "./event-store.js";
import type { SessionStore } from "./session-store.js";
import { randomUUID } from "node:crypto";
import { pexelsPageForAdventure, resolveCoverImage } from "./pexels-search.js";
import { computeSceneProgress, teamSceneFields } from "./event-milestones.js";
import { applyValidatedFlavor } from "./flavor/apply-flavor.js";

export function mountEventRoutes(app: Hono, eventStore: EventStore, _gm?: GameMasterService): void {
  void _gm;
  app.get("/adventures", async (c) => {
    const templates = listAdventureTemplates();
    const enriched = await Promise.all(
      templates.map(async (t) => {
        if (!t.pexelsQuery) return t;
        const { coverImage, coverImageSource } = await resolveCoverImage({
          pexelsQuery: t.pexelsQuery,
          page: pexelsPageForAdventure(t.id),
          localFallback: t.coverImage,
        });
        return {
          ...t,
          coverImage,
          coverImageSource,
        };
      }),
    );
    return c.json({ templates: enriched });
  });

  app.post("/events", async (c) => {
    const body = (await c.req.json<CreateEventRequest>().catch(() => null)) as CreateEventRequest | null;
    if (!body) return c.json({ error: "Cuerpo inválido" }, 400);
    const err = validateCreateEvent(body);
    if (err) return c.json({ error: err }, 400);

    const eventId = randomUUID();
    const room = applyValidatedFlavor(generateAdventureRoom(body, eventId));
    let event: StoredEvent = {
      eventId,
      joinCode: createJoinCode(),
      createdAtMs: Date.now(),
      config: body,
      title: body.eventTitle?.trim() || room.name,
      room,
      teams: {},
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
    const teams = leaderboardFromEvent(event);
    return c.json({
      preview: toEventPreview(event),
      teams,
      players: teams.map((t) => ({
        ...t,
        playerId: t.teamId,
        displayName: t.teamName,
      })),
    });
  });

  const joinTeam = async (code: string, rawBody: unknown) => {
    const event = await eventStore.getByCode(code);
    if (!event) return { status: 404, body: { error: "Evento no encontrado" } };

    const body = rawBody as JoinEventRequest | null;
    const teamName = body?.displayName?.trim();
    if (!teamName || teamName.length < 2) {
      return { status: 400, body: { error: "Indica el nombre del equipo (mínimo 2 caracteres)." } };
    }

    const e = migrateLegacyEvent(event);
    const slot = nextTeamSlot(e);
    if (slot === undefined) {
      return { status: 409, body: { error: "Cupo de equipos completo." } };
    }

    const teamId = randomUUID();
    e.teams[teamId] = {
      teamId,
      teamName,
      slot,
      status: "waiting",
      joinedAtMs: Date.now(),
    };
    await eventStore.save(e);

    return {
      status: 201,
      body: {
        teamId,
        playerId: teamId,
        slot,
        joinCode: e.joinCode,
        eventTitle: e.title,
      },
    };
  };

  app.post("/events/:code/teams", async (c) => {
    const body = await c.req.json().catch(() => null);
    const result = await joinTeam(c.req.param("code"), body);
    return c.json(result.body, result.status as 201 | 400 | 404 | 409);
  });

  app.post("/events/:code/players", async (c) => {
    const body = await c.req.json().catch(() => null);
    const result = await joinTeam(c.req.param("code"), body);
    return c.json(result.body, result.status as 201 | 400 | 404 | 409);
  });

  app.get("/events/:code/leaderboard", async (c) => {
    const event = await eventStore.getByCode(c.req.param("code"));
    if (!event) return c.json({ error: "Evento no encontrado" }, 404);
    const e = migrateLegacyEvent(event);
    const teams = leaderboardFromEvent(e);
    const { progressSummary, sceneMilestones } = computeSceneProgress(e);
    return c.json({
      joinCode: e.joinCode,
      title: e.title,
      teams,
      adventureType: e.config.adventureType,
      coverImage: e.room.coverImage,
      theme: e.room.theme,
      progressSummary,
      sceneMilestones,
      players: teams,
    });
  });
}

export async function startEventSession(
  eventCode: string,
  teamId: string,
  eventStore: EventStore,
  sessionStore: SessionStore,
  gm?: GameMasterService,
): Promise<{ status: number; body: unknown }> {
  const event = await eventStore.getByCode(eventCode);
  if (!event) return { status: 404, body: { error: "Evento no encontrado" } };

  const e = migrateLegacyEvent(event);
  const team = e.teams[teamId];
  if (!team) return { status: 404, body: { error: "Equipo no registrado en este evento" } };

  if (team.sessionId) {
    const existing = await sessionStore.get(team.sessionId);
    if (existing) {
      const view = gm ? await buildSessionView(existing, gm) : { state: toPublicState(existing), gmInterventions: [] };
      return {
        status: 200,
        body: {
          sessionId: existing.sessionId,
          state: view.state,
          gmInterventions: view.gmInterventions,
        },
      };
    }
  }

  const playerContext: PlayerContext = {
    displayName: team.teamName,
    eventId: e.eventId,
    playerId: teamId,
    joinCode: e.joinCode,
    slot: team.slot,
    eventTitle: e.title,
    adventureType: e.config.adventureType,
  };

  const session = createSession(e.room, playerContext);
  await sessionStore.set(session);
  const interventions = gm ? await gm.processSessionStarted(session) : [];
  const view = gm
    ? await buildSessionView(session, gm)
    : { state: toPublicState(session), gmInterventions: [] };

  team.sessionId = session.sessionId;
  team.status = "playing";
  await eventStore.save(e);

  return {
    status: 201,
    body: {
      sessionId: session.sessionId,
      state: view.state,
      gmInterventions: view.gmInterventions,
      interventions,
    },
  };
}

export async function syncPlayerStatusFromSession(
  eventStore: EventStore,
  session: SessionRecord,
): Promise<void> {
  const ctx = session.playerContext;
  if (!ctx?.joinCode) return;
  const event = await eventStore.getByCode(ctx.joinCode);
  if (!event) return;
  const e = migrateLegacyEvent(event);
  const team = e.teams[ctx.playerId];
  if (!team || team.sessionId !== session.sessionId) return;

  const elapsed = Math.floor((Date.now() - session.startedAtMs) / 1000);
  team.timeRemainingSec = Math.max(0, session.room.timeLimitSec - elapsed);
  team.elapsedSec = elapsed;
  team.puzzlesSolved = session.solvedPuzzles.size;
  Object.assign(team, teamSceneFields(session.currentSceneId, session.room));
  if (session.status === "won") team.status = "won";
  else if (session.status === "lost") team.status = "lost";
  else team.status = "playing";

  await eventStore.save(e);
}
