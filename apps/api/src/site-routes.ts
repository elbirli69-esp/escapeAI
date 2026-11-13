import {
  buildSpatialSiteRoom,
  dailyPlaySeed,
  pickSiteProposal,
  proposeSiteAdventuresResponse,
} from "@escapeai/escape-content";
import type { CreateSpatialSiteEventRequest, SaveScannedSiteRequest } from "@escapeai/shared";
import { resolveDurationMin, resolveTeamCount } from "@escapeai/shared";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { EventStore } from "./event-store.js";
import { createJoinCode, toEventPreview, type StoredEvent } from "./event-store.js";
import { initTeamVariable, resolveTeamVariableConfig } from "./team-variable.js";
import type { ScannedEnvironmentStore } from "./scanned-environment-store.js";
import { parseAndSanitizeSiteBody, type ScannedSiteStore } from "./scanned-site-store.js";

async function loadSiteRooms(
  envStore: ScannedEnvironmentStore,
  roomIds: string[],
) {
  const rooms = [];
  for (const id of roomIds) {
    const env = await envStore.getById(id);
    if (!env) return { error: `Inventario no encontrado: ${id}` as const };
    rooms.push(env);
  }
  if (rooms.length < 2) return { error: "El recinto necesita al menos dos habitaciones." as const };
  return { rooms };
}

export function mountSiteRoutes(
  app: Hono,
  siteStore: ScannedSiteStore,
  envStore: ScannedEnvironmentStore,
  eventStore?: EventStore,
): void {
  app.get("/scanned-sites", async (c) => {
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const items = await siteStore.listSummaries(limit);
    return c.json({ items });
  });

  app.get("/scanned-sites/:id", async (c) => {
    const site = await siteStore.getById(c.req.param("id"));
    if (!site) return c.json({ error: "Recinto no encontrado" }, 404);
    return c.json({ site });
  });

  app.post("/scanned-sites", async (c) => {
    const raw = await c.req.json().catch(() => null);
    const parsed = parseAndSanitizeSiteBody(raw);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const loaded = await loadSiteRooms(envStore, parsed.body.roomIds);
    if ("error" in loaded) return c.json({ error: loaded.error }, 400);
    const site = await siteStore.create(parsed.body as SaveScannedSiteRequest);
    return c.json({ site }, 201);
  });

  app.put("/scanned-sites/:id", async (c) => {
    const id = c.req.param("id");
    const raw = await c.req.json().catch(() => null);
    const parsed = parseAndSanitizeSiteBody({ ...(raw as object), id });
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);
    const loaded = await loadSiteRooms(envStore, parsed.body.roomIds);
    if ("error" in loaded) return c.json({ error: loaded.error }, 400);
    const site = await siteStore.update(id, parsed.body as SaveScannedSiteRequest);
    if (!site) return c.json({ error: "Recinto no encontrado" }, 404);
    return c.json({ site });
  });

  app.post("/scanned-sites/:id/proposals", async (c) => {
    const site = await siteStore.getById(c.req.param("id"));
    if (!site) return c.json({ error: "Recinto no encontrado" }, 404);
    const loaded = await loadSiteRooms(envStore, site.roomIds);
    if ("error" in loaded) return c.json({ error: loaded.error }, 400);
    return c.json(proposeSiteAdventuresResponse(site, loaded.rooms));
  });

  app.post("/scanned-sites/:id/events", async (c) => {
    if (!eventStore) return c.json({ error: "Eventos no disponibles" }, 503);
    const site = await siteStore.getById(c.req.param("id"));
    if (!site) return c.json({ error: "Recinto no encontrado" }, 404);
    const loaded = await loadSiteRooms(envStore, site.roomIds);
    if ("error" in loaded) return c.json({ error: loaded.error }, 400);

    const body = (await c.req.json<CreateSpatialSiteEventRequest>().catch(() => null)) as CreateSpatialSiteEventRequest | null;
    if (!body?.proposalId) return c.json({ error: "Indica proposalId" }, 400);

    const proposal = pickSiteProposal(site, loaded.rooms, body.proposalId);
    if (!proposal) return c.json({ error: "Propuesta no válida para este recinto" }, 400);

    const eventId = randomUUID();
    const teamCount = resolveTeamCount({ teamCount: body.teamCount ?? 2 });
    const durationMin = resolveDurationMin({ durationMin: body.durationMin ?? proposal.durationMin });
    const playSeed = dailyPlaySeed(`spatial-site:${eventId}`);
    const room = buildSpatialSiteRoom(site, loaded.rooms, proposal, eventId, playSeed);

    const title = body.eventTitle?.trim() || proposal.title;
    const subjectName = body.subject?.name?.trim() || site.name;
    const roomVersions = Object.fromEntries(loaded.rooms.map((r) => [r.id, r.version]));
    const eventConfig = {
      adventureType: "team" as const,
      teamCount,
      durationMin,
      subject: { name: subjectName, nickname: body.subject?.nickname },
      facts: [`Recinto: ${site.name}`, `Propuesta: ${proposal.title}`],
      eventTitle: title,
      scannedSiteId: site.id,
      siteVersion: site.version,
      roomInventoryVersions: roomVersions,
      spatialProposalId: proposal.id,
      playSeed,
      teamVariable: body.teamVariable,
    };
    const tvConfig = resolveTeamVariableConfig(eventConfig);

    let event: StoredEvent = {
      eventId,
      joinCode: createJoinCode(),
      createdAtMs: Date.now(),
      config: eventConfig,
      title,
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
