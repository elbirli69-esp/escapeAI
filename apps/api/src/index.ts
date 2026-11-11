import { serve } from "@hono/node-server";
import { loadRoomById } from "@escapeai/escape-content";
import {
  applyAction,
  createSession,
  toAiContext,
  toPublicState,
  type SessionRecord,
} from "@escapeai/escape-engine";
import type { GameAction } from "@escapeai/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

const sessions = new Map<string, SessionRecord>();

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/sessions", async (c) => {
  const body = (await c.req.json<{ roomId?: string }>().catch(() => ({}))) as {
    roomId?: string;
  };
  const roomId = body.roomId ?? "pilot";
  const room = loadRoomById(roomId);
  const session = createSession(room);
  sessions.set(session.sessionId, session);
  return c.json({ sessionId: session.sessionId, state: toPublicState(session) }, 201);
});

app.get("/sessions/:sessionId", (c) => {
  const session = sessions.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
  return c.json({ state: toPublicState(session) });
});

app.get("/sessions/:sessionId/ai-context", (c) => {
  const session = sessions.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);
  return c.json({ context: toAiContext(session) });
});

app.post("/sessions/:sessionId/actions", async (c) => {
  const session = sessions.get(c.req.param("sessionId"));
  if (!session) return c.json({ error: "Sesión no encontrada" }, 404);

  const action = (await c.req.json()) as GameAction;
  const result = applyAction(session, action);
  return c.json(result);
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`escapeAI API listening on http://localhost:${port}`);
});
