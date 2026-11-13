import { listRoomIds, loadRoomById, ROOM_CATALOG } from "@escapeai/escape-content";
import { createSession, toAiContext } from "@escapeai/escape-engine";
import type { CreateSessionRequest, GameAction, GameEvent } from "@escapeai/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { runGameplayAction } from "./app-gm.js";
import { createEventStore } from "./event-store.js";
import { createScannedEnvironmentStore } from "./scanned-environment-store.js";
import { createScannedSiteStore } from "./scanned-site-store.js";
import {
  buildSessionView,
  createGmInterventionStore,
  GameMasterService,
  getGmHealthSnapshot,
  snapshotExits,
  toOrchestratorShim,
} from "./gamemaster/index.js";
import { mountScannerRoutes } from "./scanner-routes.js";
import { mountSiteRoutes } from "./site-routes.js";
import { mountEventRoutes, startEventSession } from "./events-routes.js";
import { mountMediaRoutes } from "./media-routes.js";
import { mountLobbyRoutes } from "./lobby-routes.js";
import { resolveCoverImage } from "./pexels-search.js";
import { resolveLlmConfig } from "./llm-config.js";
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
  const scannedStore = await createScannedEnvironmentStore();
  const siteStore = await createScannedSiteStore();
  const gmStore = await createGmInterventionStore();
  const gm = new GameMasterService(gmStore);
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
      gameMaster: {
        enabled: true,
        llmConfigured: Boolean(llm),
        runtime: getGmHealthSnapshot(),
      },
    });
  });

  mountEventRoutes(app, eventStore, gm);
  mountScannerRoutes(app, scannedStore, eventStore);
  mountSiteRoutes(app, siteStore, scannedStore, eventStore);
  mountMediaRoutes(app);
  mountLobbyRoutes(app);

  app.get("/rooms", async (c) => {
    const rooms = await Promise.all(
      ROOM_CATALOG.map(async (entry) => {
        const def = loadRoomById(entry.id);
        const localCover = def.coverImage ?? entry.coverImage ?? "/media/pilot-cover.jpg";
        const { coverImage, coverImageSource } = await resolveCoverImage({
          pexelsQuery: entry.pexelsQuery,
          page: entry.pexelsPage ?? 1,
          localFallback: localCover,
        });
        return {
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          tagline: def.tagline ?? entry.tagline,
          coverImage,
          coverImageSource,
          theme: def.theme ?? entry.theme,
          sceneCount: Object.keys(def.scenes).length,
          timeLimitSec: def.timeLimitSec,
        };
      }),
    );
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
        gm,
      );
      return c.json(result.body, result.status as 200 | 201 | 404);
    }

    const roomId = "roomId" in body ? (body.roomId ?? "pilot") : "pilot";
    const room = loadRoomById(roomId);
    const session = createSession(room);
    await sessionStore.set(session);
    const interventions = await gm.processSessionStarted(session);
    const view = await buildSessionView(session, gm);
    return c.json(
      {
        sessionId: session.sessionId,
        state: view.state,
        gmInterventions: view.gmInterventions,
        interventions,
        orchestrator: toOrchestratorShim(interventions[interventions.length - 1]),
      },
      201,
    );
  });

  app.get("/sessions/:sessionId", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
    const onRead = await gm.processOnRead(session);
    const view = await buildSessionView(session, gm);
    return c.json({
      state: view.state,
      gmInterventions: view.gmInterventions,
      interventions: onRead,
    });
  });

  app.get("/sessions/:sessionId/gm-interventions", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
    const gmInterventions = await gm.listInterventions(session.sessionId);
    return c.json({ gmInterventions });
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
    if (events.some((e) => e.type === "hint_requested")) {
      const view = await buildSessionView(session, gm);
      return c.json({ orchestrator: undefined, state: view.state, gmInterventions: view.gmInterventions });
    }
    const beforeExits = snapshotExits(session);
    const interventions = await gm.processAfterAction({
      session,
      action: { type: "move", sceneId: session.currentSceneId },
      events,
      beforeExits,
    });
    const view = await buildSessionView(session, gm);
    return c.json({
      orchestrator: toOrchestratorShim(interventions[interventions.length - 1]),
      state: view.state,
      gmInterventions: view.gmInterventions,
      interventions,
    });
  });

  app.post("/sessions/:sessionId/actions", async (c) => {
    const session = await sessionStore.get(c.req.param("sessionId"));
    if (!session) return c.json({ error: "Sesión no encontrada" }, 404);

    const action = (await c.req.json()) as GameAction;
    const payload = await runGameplayAction({
      session,
      action,
      sessionStore,
      eventStore,
      gm,
    });
    return c.json(payload);
  });

  return app;
}
