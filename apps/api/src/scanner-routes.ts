import { buildSpatialRoom, pickProposal, proposeSpatialAdventuresResponse } from "@escapeai/escape-content";
import type { CreateSpatialEventRequest, SaveScannedEnvironmentRequest } from "@escapeai/shared";
import { resolveDurationMin, resolveTeamCount } from "@escapeai/shared";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { EventStore } from "./event-store.js";
import { createJoinCode, toEventPreview, type StoredEvent } from "./event-store.js";
import type { ScannedEnvironmentStore } from "./scanned-environment-store.js";
import { parseAndSanitizeScanBody } from "./scanned-environment-store.js";

export function mountScannerRoutes(
  app: Hono,
  store: ScannedEnvironmentStore,
  eventStore?: EventStore,
): void {
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

  app.post("/scanned-environments/:id/proposals", async (c) => {
    const env = await store.getById(c.req.param("id"));
    if (!env) return c.json({ error: "Inventario no encontrado" }, 404);
    return c.json(proposeSpatialAdventuresResponse(env));
  });

  app.post("/scanned-environments/:id/events", async (c) => {
    if (!eventStore) return c.json({ error: "Eventos no disponibles" }, 503);
    const env = await store.getById(c.req.param("id"));
    if (!env) return c.json({ error: "Inventario no encontrado" }, 404);

    const body = (await c.req.json<CreateSpatialEventRequest>().catch(() => null)) as CreateSpatialEventRequest | null;
    if (!body?.proposalId) return c.json({ error: "Indica proposalId" }, 400);

    const proposal = pickProposal(env, body.proposalId);
    if (!proposal) return c.json({ error: "Propuesta no válida para este inventario" }, 400);

    const eventId = randomUUID();
    const room = buildSpatialRoom(env, proposal, eventId);
    const teamCount = resolveTeamCount({ teamCount: body.teamCount ?? 2 });
    const durationMin = resolveDurationMin({ durationMin: body.durationMin ?? proposal.durationMin });

    const title = body.eventTitle?.trim() || proposal.title;
    const subjectName = body.subject?.name?.trim() || env.name;

    let event: StoredEvent = {
      eventId,
      joinCode: createJoinCode(),
      createdAtMs: Date.now(),
      config: {
        adventureType: "team",
        teamCount,
        durationMin,
        subject: { name: subjectName, nickname: body.subject?.nickname },
        facts: [`Espacio escaneado: ${env.name}`, `Propuesta: ${proposal.title}`],
        eventTitle: title,
        scannedEnvironmentId: env.id,
        inventoryVersion: env.version,
        spatialProposalId: proposal.id,
      },
      title,
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

    return c.json(
      {
        preview: toEventPreview(event),
        proposal,
        prepChecklist: proposal.prepChecklist,
      },
      201,
    );
  });
}
