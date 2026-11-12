import type { SaveScannedEnvironmentRequest } from "@escapeai/shared";
import { Hono } from "hono";
import type { ScannedEnvironmentStore } from "./scanned-environment-store.js";
import { parseAndSanitizeScanBody } from "./scanned-environment-store.js";

export function mountScannerRoutes(app: Hono, store: ScannedEnvironmentStore): void {
  app.get("/scanned-environments", async (c) => {
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const items = await store.listSummaries(limit);
    return c.json({ items });
  });

  app.get("/scanned-environments/:id", async (c) => {
    const env = await store.getById(c.req.param("id"));
    if (!env) return c.json({ error: "Inventario no encontrado" }, 404);
    return c.json({ environment: env });
  });

  app.post("/scanned-environments", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = parseAndSanitizeScanBody(raw);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const env = await store.create(parsed.body as SaveScannedEnvironmentRequest);
    return c.json({ environment: env }, 201);
  });

  app.put("/scanned-environments/:id", async (c) => {
    const id = c.req.param("id");
    const raw = await c.req.json().catch(() => null);
    const parsed = parseAndSanitizeScanBody({ ...(raw as object), id });
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const env = await store.update(id, parsed.body as SaveScannedEnvironmentRequest);
    if (!env) return c.json({ error: "Inventario no encontrado" }, 404);
    return c.json({ environment: env });
  });
}
