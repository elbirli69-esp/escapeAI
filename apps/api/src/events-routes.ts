import {
  buildGeneratedPrepChecklist,
  generateAdventureRoom,
  listAdventureTemplates,
  posterKeywordForOrganizer,
} from "@escapeai/escape-content";
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
import {
  pexelsPageForAdventure,
  resolveAdventureTemplateCover,
  resolveCoverImage,
} from "./pexels-search.js";
import { computeSceneProgress, teamSceneFields } from "./event-milestones.js";
import {
  assignPlayerRole,
  eventHasAsymmetricRoles,
  findTeamByName,
  syncAsymmetricTeamAfterAction,
  upsertTeamMember,
} from "./asymmetric-team.js";
import { isPlayerRoleId, PLAYER_ROLE_LABELS, type PlayerRoleId } from "@escapeai/shared";
import { applyValidatedFlavor } from "./flavor/apply-flavor.js";
import { initTeamVariable, resolveTeamVariableConfig, teamVariableToPublic } from "./team-variable.js";
import { refreshSessionTeamProgress } from "./team-variable.js";
import { dailyPlaySeed } from "@escapeai/escape-content";

export function mountEventRoutes(
  app: Hono,
  eventStore: EventStore,
  sessionStore: SessionStore,
  _gm?: GameMasterService,
): void {
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
    const tvConfig = resolveTeamVariableConfig(body);
    body.playSeed = body.playSeed ?? dailyPlaySeed(`generated:${eventId}`);
    let room = applyValidatedFlavor(generateAdventureRoom(body, eventId));
    const { coverImage: templateCover } = await resolveAdventureTemplateCover(
      body.adventureType,
      room.coverImage ?? "/media/pilot-cover.jpg",
    );
    room = { ...room, coverImage: templateCover };
    if (tvConfig?.puzzleId) {
      const start = room.scenes.start;
      if (start) {
        start.description = `${start.description.trim()} Cuando ${tvConfig.goal} equipos resuelvan el candado inicial, el organizador verá el candado comunitario al día.`;
      }
    }
    let event: StoredEvent = {
      eventId,
      joinCode: createJoinCode(),
      createdAtMs: Date.now(),
      config: body,
      title: body.eventTitle?.trim() || room.name,
      room,
      teams: {},
      teamVariable: tvConfig ? initTeamVariable(tvConfig) : undefined,
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
    const asymmetric = eventHasAsymmetricRoles(e);
    const existing = asymmetric ? findTeamByName(e, teamName) : undefined;
    if (existing) {
      return {
        status: 200,
        body: {
          teamId: existing.teamId,
          playerId: existing.teamId,
          slot: existing.slot,
          joinCode: e.joinCode,
          eventTitle: e.title,
          asymmetricRoles: true,
        },
      };
    }

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
        asymmetricRoles: asymmetric || undefined,
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

  app.post("/events/:code/saga-release-act2", async (c) => {
    const { releaseSagaAct2 } = await import("./saga-event.js");
    const result = await releaseSagaAct2(c.req.param("code"), eventStore, sessionStore);
    return c.json(result.body, result.status as 200 | 400 | 404);
  });

  app.get("/events/:code/leaderboard", async (c) => {
    const event = await eventStore.getByCode(c.req.param("code"));
    if (!event) return c.json({ error: "Evento no encontrado" }, 404);
    const e = migrateLegacyEvent(event);
    const teams = leaderboardFromEvent(e);
    const { progressSummary, sceneMilestones } = computeSceneProgress(e);
    const hybridPlayMode = e.config.hybridPlayMode ?? "room";
    const prepChecklist = buildGeneratedPrepChecklist(e.room, {
      joinCode: e.joinCode,
      hybridPlayMode,
    });
    const posterKeyword = posterKeywordForOrganizer(e.room);
    return c.json({
      joinCode: e.joinCode,
      title: e.title,
      teams,
      adventureType: e.config.adventureType,
      coverImage: e.room.coverImage,
      theme: e.room.theme,
      progressSummary,
      sceneMilestones,
      teamVariable: e.teamVariable ? teamVariableToPublic(e.teamVariable) : undefined,
      prepChecklist,
      posterKeyword,
      hybridPlayMode,
      asymmetricRoles: e.config.asymmetricRoles,
      sagaTwoActs: e.config.sagaTwoActs,
      sagaAct2Released: e.sagaAct2Released,
      players: teams,
    });
  });
}

export type StartEventSessionOptions = {
  playerRole?: PlayerRoleId;
  memberName?: string;
  memberId?: string;
};

export async function startEventSession(
  eventCode: string,
  teamId: string,
  eventStore: EventStore,
  sessionStore: SessionStore,
  gm?: GameMasterService,
  opts?: StartEventSessionOptions,
): Promise<{ status: number; body: unknown }> {
  const event = await eventStore.getByCode(eventCode);
  if (!event) return { status: 404, body: { error: "Evento no encontrado" } };

  const e = migrateLegacyEvent(event);
  const team = e.teams[teamId];
  if (!team) return { status: 404, body: { error: "Equipo no registrado en este evento" } };

  const asymmetric = eventHasAsymmetricRoles(e);

  if (asymmetric) {
    const resumeId = opts?.memberId;
    if (resumeId && team.members?.[resumeId]?.sessionId) {
      const existing = await sessionStore.get(team.members[resumeId].sessionId!);
      if (existing) {
        await refreshSessionTeamProgress(eventStore, existing);
        await syncAsymmetricTeamAfterAction({ eventStore, sessionStore, session: existing });
        const view = gm
          ? await buildSessionView(existing, gm)
          : { state: toPublicState(existing), gmInterventions: [] };
        return {
          status: 200,
          body: {
            sessionId: existing.sessionId,
            memberId: resumeId,
            playerRole: existing.playerContext?.playerRole,
            state: view.state,
            gmInterventions: view.gmInterventions,
          },
        };
      }
    }
  } else if (team.sessionId) {
    const existing = await sessionStore.get(team.sessionId);
    if (existing) {
      await refreshSessionTeamProgress(eventStore, existing);
      await sessionStore.set(existing);
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

  let assignedRole: PlayerRoleId | undefined;
  if (asymmetric) {
    const requested = opts?.playerRole && isPlayerRoleId(opts.playerRole) ? opts.playerRole : undefined;
    assignedRole = assignPlayerRole(team, requested);
    if (!assignedRole) {
      return {
        status: 409,
        body: {
          error:
            "Este equipo ya tiene los dos roles en juego. Usa el mismo nombre de equipo en el segundo móvil.",
        },
      };
    }
  }

  const memberId = asymmetric ? opts?.memberId ?? randomUUID() : teamId;

  const playerContext: PlayerContext = asymmetric
    ? {
        displayName:
          opts?.memberName?.trim() || `${team.teamName} · ${PLAYER_ROLE_LABELS[assignedRole!]}`,
        eventId: e.eventId,
        playerId: memberId,
        teamId,
        joinCode: e.joinCode,
        slot: team.slot,
        eventTitle: e.title,
        adventureType: e.config.adventureType,
        playerRole: assignedRole,
        asymmetricRoles: true,
      }
    : {
        displayName: team.teamName,
        eventId: e.eventId,
        playerId: teamId,
        teamId,
        joinCode: e.joinCode,
        slot: team.slot,
        eventTitle: e.title,
        adventureType: e.config.adventureType,
      };

  const session = createSession(e.room, playerContext);
  await refreshSessionTeamProgress(eventStore, session);
  await sessionStore.set(session);
  const interventions = gm ? await gm.processSessionStarted(session) : [];
  const view = gm
    ? await buildSessionView(session, gm)
    : { state: toPublicState(session), gmInterventions: [] };

  if (asymmetric) {
    upsertTeamMember(team, memberId, {
      role: assignedRole!,
      sessionId: session.sessionId,
      displayName: playerContext.displayName,
    });
  } else {
    team.sessionId = session.sessionId;
  }
  team.status = "playing";
  await eventStore.save(e);

  return {
    status: 201,
    body: {
      sessionId: session.sessionId,
      memberId: asymmetric ? memberId : undefined,
      playerRole: asymmetric ? assignedRole : undefined,
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
  const teamId = ctx.teamId ?? ctx.playerId;
  const team = e.teams[teamId];
  if (!team) return;
  const member = ctx.playerRole ? team.members?.[ctx.playerId] : undefined;
  const boundSessionId = member?.sessionId ?? team.sessionId;
  if (boundSessionId !== session.sessionId) return;

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
