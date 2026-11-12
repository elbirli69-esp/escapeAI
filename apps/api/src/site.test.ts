import { describe, expect, it } from "vitest";
import { buildSpatialSiteRoom, pickSiteProposal } from "@escapeai/escape-content";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import { MemoryScannedEnvironmentStore } from "./scanned-environment-store.js";
import { MemoryScannedSiteStore } from "./scanned-site-store.js";

const roomPayload = (name: string) => ({
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

describe("scanned site flow", () => {
  it("genera sala multi-escena con quiz de entorno, no waypoints interiores", async () => {
    const envStore = new MemoryScannedEnvironmentStore();
    const siteStore = new MemoryScannedSiteStore();
    const a = await envStore.create(roomPayload("Salón"));
    const b = await envStore.create(roomPayload("Dormitorio"));
    const site = await siteStore.create({
      name: "Piso demo",
      roomIds: [a.id, b.id],
      links: [
        {
          id: "link-1",
          fromRoomId: a.id,
          toRoomId: b.id,
          label: "Puerta",
          transitionKind: "door",
          confirmed: true,
        },
      ],
      mapLayout: "linear",
      geoContext: {
        city: "Valencia",
        neighborhood: "Carmen",
        anchorLat: 39.47,
        anchorLon: -0.38,
      },
    });

    const proposal = pickSiteProposal(site, [a, b], "spatial-site-recorrido")!;
    const room = buildSpatialSiteRoom(site, [a, b], proposal, randomUUID());

    expect(Object.keys(room.scenes).length).toBeGreaterThanOrEqual(3);
    const geoPuzzle = room.puzzles.site_area_geo;
    expect(geoPuzzle?.locationIntent).toBe("area_context");
    expect(geoPuzzle?.locationMode).toBe("quiz");
    expect(geoPuzzle!.radiusMeters!).toBeGreaterThan(1000);
    expect(room.startSceneId).toBe("site_context");
    expect(room.spatialSiteMap?.siteName).toBe("Piso demo");
  });
});
