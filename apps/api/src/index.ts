import { serve } from "@hono/node-server";
import { listRoomIds, loadRoomById, ROOM_CATALOG } from "@escapeai/escape-content";
import {
  applyAction,
  createSession,
  toAiContext,
  toPublicState,
  type SessionRecord,
} from "@escapeai/escape-engine";
import type { GameAction, GameEvent } from "@escapeai/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { runOrchestrator } from "./orchestrator.js";
import { createSessionStore, type SessionStore } from "./session-store.js";

let store: SessionStore;

const app = new Hono();

const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use("*", cors({ origin: corsOrigins }));

app.get("/health", (c) => c.json({ ok: true, persistence: Boolean(process.env.SESSION_DATA_DIR) }));

app.get("/rooms", (c) => {
  const rooms = ROOM_CATALOG.map((entry) => {
    const def = loadRoomById(entry.id);
    return {
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      timeLimitSec: def.timeLimitSec,
    };
  });
  return c.json({ rooms, ids: listRoomIds() });
});

async function saveSession(session: SessionRecord): Promise<void> {
  await store.set(session);
}

app.post("/sessions", async (c) => {
  const body = (await c.req.json<{ roomId?: string }>().catch(() => ({}))) as {
    roomId?: string;
  };
  const roomId = body.roomId ?? "pilot";
  const room = loadRoomById(roomId);
  const session = createSession(room);
  const intro = await runOrchestrator(session, []);
  if (intro.message) session.narrative.push(intro.message);
  await saveSession(session);
  return c.json({ sessionId: session.sessionId, state: toPublicState(session) }, 201);
});

app.get("/sessions/:sessionId", async (c) => {
  const session = await store.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
  return c.json({ state: toPublicState(session) });
});

app.get("/sessions/:sessionId/ai-context", async (c) => {
  const session = await store.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
  return c.json({ context: toAiContext(session) });
});

app.post("/sessions/:sessionId/orchestrate", async (c) => {
  const session = await store.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);

  const body = (await c.req.json<{ events?: GameEvent[] }>().catch(() => ({}))) as {
    events?: GameEvent[];
  };
  const events = body.events ?? [];
  const orchestrator = await runOrchestrator(session, events);
  if (orchestrator.message) {
    session.narrative.push(orchestrator.message);
    await saveSession(session);
  }
  return c.json({ orchestrator, state: toPublicState(session) });
});

app.post("/sessions/:sessionId/actions", async (c) => {
  const session = await store.get(c.req.param("sessionId"));
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

  await saveSession(session);
  return c.json({ ...result, state: toPublicState(session), orchestrator });
});

function shouldOrchestrate(events: GameEvent[]): boolean {
  if (events.length === 0) return false;
  return events.some((e) =>
    ["puzzle_failed", "scene_entered", "game_won", "game_lost"].includes(e.type),
  );
}

const port = Number(process.env.PORT ?? 8787);

async function main() {
  store = await createSessionStore();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`escapeAI API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
