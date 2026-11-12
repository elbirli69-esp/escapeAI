import { describe, expect, it } from "vitest";
import { loadRoomById } from "@escapeai/escape-content";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";
import { createApp } from "../app.js";
import { MemorySessionStore } from "../session-store.js";

describe("GameMaster API routes", () => {
  it("GET sesión devuelve gmInterventions tras inicio", async () => {
    const store = new MemorySessionStore();
    const app = await createApp(store);
    const res = await app.request("http://test/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: "pilot" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      sessionId: string;
      gmInterventions?: Array<{ text: string }>;
    };
    expect(body.gmInterventions?.length).toBeGreaterThan(0);

    const get = await app.request(`http://test/api/sessions/${body.sessionId}`);
    expect(get.status).toBe(200);
    const view = (await get.json()) as { gmInterventions: Array<{ text: string; sessionId: string }> };
    expect(view.gmInterventions.length).toBeGreaterThanOrEqual(body.gmInterventions!.length);
    expect(view.gmInterventions.every((i) => i.sessionId === body.sessionId)).toBe(true);
  });

  it("persistencia independiente: intervenciones sobreviven tras set de sesión", async () => {
    const sessionStore = new MemorySessionStore();
    const gmStore = new MemoryGmInterventionStore();
    const gm = new GameMasterService(gmStore);
    const room = loadRoomById("pilot");
    const { createSession } = await import("@escapeai/escape-engine");
    const session = createSession(room);
    await sessionStore.set(session);
    await gm.processSessionStarted(session);
    const listed = await gm.listInterventions(session.sessionId);
    expect(listed.length).toBe(1);

    session.narrative.push("motor: prueba");
    await sessionStore.set(session);
    const listed2 = await gm.listInterventions(session.sessionId);
    expect(listed2.length).toBe(1);
    expect(listed2[0].id).toBe(listed[0].id);
  });
});
