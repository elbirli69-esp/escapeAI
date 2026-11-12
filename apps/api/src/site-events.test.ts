import { describe, expect, it } from "vitest";
import { buildSpatialSiteRoom, pickSiteProposal } from "@escapeai/escape-content";
import { createSession, toPublicState } from "@escapeai/escape-engine";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import { MemoryEventStore } from "./event-store.js";
import { MemoryScannedEnvironmentStore } from "./scanned-environment-store.js";
import { MemoryScannedSiteStore } from "./scanned-site-store.js";

const roomEnv = (name: string) => ({
  name,
  environmentType: "living_room" as const,
  objects: [
    {
      id: "c1",
      category: "clock" as const,
      quantity: 1,
      confidence: 0.9,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
  constraints: defaultEnvironmentConstraints(),
});

describe("scanned site events", () => {
  it("snapshot del recinto no cambia tras editar site; PublicState incluye ruta sugerida", async () => {
    const envStore = new MemoryScannedEnvironmentStore();
    const siteStore = new MemoryScannedSiteStore();
    const eventStore = new MemoryEventStore();

    const a = await envStore.create(roomEnv("Salón"));
    const b = await envStore.create(roomEnv("Cocina"));
    const site = await siteStore.create({
      name: "Recinto QA",
      roomIds: [a.id, b.id],
      links: [
        {
          id: "lnk1",
          fromRoomId: a.id,
          toRoomId: b.id,
          label: "Puerta",
          transitionKind: "door",
          confirmed: true,
        },
      ],
      mapLayout: "linear",
    });

    const proposal = pickSiteProposal(site, [a, b], "spatial-site-recorrido")!;
    const eventId = randomUUID();
    const room = buildSpatialSiteRoom(site, [a, b], proposal, eventId);

    await eventStore.create({
      eventId,
      joinCode: "SITE42",
      createdAtMs: Date.now(),
      config: {
        adventureType: "team",
        teamCount: 2,
        subject: { name: site.name },
        facts: [],
        scannedSiteId: site.id,
        siteVersion: site.version,
        roomInventoryVersions: { [a.id]: a.version, [b.id]: b.version },
        spatialProposalId: proposal.id,
      },
      title: proposal.title,
      room,
      teams: {},
    });

    await siteStore.update(site.id, {
      name: "Recinto MODIFICADO",
      roomIds: [a.id, b.id],
      links: site.links,
      mapLayout: "hub",
    });

    const eventAfter = await eventStore.getByCode("SITE42");
    expect(eventAfter?.config.siteVersion).toBe(1);
    expect(eventAfter?.room.spatialSiteMap?.siteName).toBe("Recinto QA");
    expect(eventAfter?.room.spatialSiteMap?.suggestedVisit).toHaveLength(2);

    const session = createSession(eventAfter!.room);
    const state = toPublicState(session);
    expect(state.spatialSiteMap?.suggestedVisit[0]?.label).toBe("Salón");
    expect(state.spatialSiteMap?.currentVisitOrder).toBe(1);
  });
});
