import { listRoomIds, loadRoomById, ROOM_CATALOG } from "@escapeai/escape-content";
import {
  applyAction,
  createSession,
  toAiContext,
  toPublicState,
} from "@escapeai/escape-engine";
import type { CreateSessionRequest, GameAction, GameEvent } from "@escapeai/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createEventStore } from "./event-store.js";
import { mountEventRoutes, startEventSession, syncPlayerStatusFromSession } from "./events-routes.js";
import { mountMediaRoutes } from "./media-routes.js";
import { resolveLlmConfig } from "./llm-config.js";
import { runOrchestrator } from "./orchestrator.js";
import {
  createSessionStore,
  getSessionStoreMeta,
  type SessionStore,
} from "./session-store.js";

export function getDefaultCorsOrigins(): string[] {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(",").map((s) => s.trim());
  }
  const origins = ["http://localhost:5173", "http://127.0.0.1:5173"];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) origins.push(prod.startsWith("http") ? prod : `https://${prod}`);
  return [...new Set(origins)];
}

export async function createApp(store?: SessionStore): Promise<Hono> {
  const sessionStore = store ?? (await createSessionStore());
  const eventStore = await createEventStore();
  const app = new Hono().basePath("/api");

  app.use("*", cors({ origin: getDefaultCorsOrigins() }));

  app.get("/health", (c) => {
    const storeMeta = getSessionStoreMeta();
    const llm = resolveLlmConfig();
    return c.json({
      ok: true,
      persistence: storeMeta.kind,
      sessionTtlSec: storeMeta.ttlSec,
      runtime: process.env.VERCEL ? "vercel" : "node",
      narrator: llm
        ? { configured: true, provider: llm.provider, model: llm.model }
        : { configured: false },
    });
  });

  mountEventRoutes(app, eventStore);
  mountMediaRoutes(app);

  app.get("/rooms", (c) => {
    const rooms = ROOM_CATALOG.map((entry) => {
      const def = loadRoomById(entry.id);
      return {
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        tagline: def.tagline ?? entry.tagline,
        coverImage: def.coverImage ?? entry.coverImage,
        theme: def.theme ?? entry.theme,
        sceneCount: Object.keys(def.scenes).length,
        timeLimitSec: def.timeLimitSec,
      };
    });
    return c.json({ rooms, ids: listRoomIds() });
  });

  app.post("/sessions", async (c) => {
    const body = (await c.req.json<CreateSessionRequest>().catch(() => ({}))) as CreateSessionRequest;

    const teamId =
      "eventCode" in body ? (body.teamId ?? body.playerId) : undefined;
    if ("eventCode" in body && body.eventCode && teamId) {
      const result = await startEventSession(
        body.eventCode,
        teamId,
        eventStore,
        sessionStore,
      );
      return c.json(result.body, result.status as 200 | 201 | 404);
    }

    const roomId = "roomId" in body ? (body.roomId ?? "pilot") : "pilot";
    const room = loadRoomById(roomId);
    const session = createSession(room);
    const intro = await runOrchestrator(session, []);
    if (intro.message) session.narrative.push(intro.message);
    await sessionStore.set(session);
    return c.json({ sessionId: session.sessionId, state: toPublicState(session) }, 201);
  });

  app.get("/sessions/:sessionId", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
    return c.json({ state: toPublicState(session) });
  });

  app.get("/sessions/:sessionId/ai-context", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
    return c.json({ context: toAiContext(session) });
  });

  app.post("/sessions/:sessionId/orchestrate", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);

    const body = (await c.req.json<{ events?: GameEvent[] }>().catch(() => ({}))) as {
      events?: GameEvent[];
    };
    const events = body.events ?? [];
    const orchestrator = await runOrchestrator(session, events);
    if (orchestrator.message) {
      session.narrative.push(orchestrator.message);
      await sessionStore.set(session);
    }
    return c.json({ orchestrator, state: toPublicState(session) });
  });

  app.post("/sessions/:sessionId/actions", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);

    const action = (await c.req.json()) as GameAction;
    const result = applyAction(session, action);

    let orchestrator;
    if (shouldOrchestrate(result.events)) {
      orchestrator = await runOrchestrator(session, result.events);
      if (orchestrator.message) {
        session.narrative.push(orchestrator.message);
      }
    }

    await sessionStore.set(session);
    await syncPlayerStatusFromSession(eventStore, session);
    return c.json({ ...result, state: toPublicState(session), orchestrator });
  });

  return app;
}

function shouldOrchestrate(events: GameEvent[]): boolean {
  if (events.length === 0) return false;
  return events.some((e) =>
    ["puzzle_failed", "scene_entered", "game_won", "game_lost", "hint_requested"].includes(e.type),
  );
}
