import { describe, expect, it } from "vitest";
import { buildSpatialSiteRoom } from "./build-site-room.js";
import { pickSiteProposal } from "./generate-site-proposals.js";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { randomUUID } from "node:crypto";

const env = (id: string, name: string) => ({
  id,
  name,
  environmentType: "living_room" as const,
  objects: [
    {
      id: "c1",
      category: "clock" as const,
      quantity: 1,
      confidence: 1,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
  constraints: defaultEnvironmentConstraints(),
  createdAt: "",
  updatedAt: "",
  version: 1,
});

describe("buildSpatialSiteRoom hub", () => {
  it("expone mapa público y varias salidas desde la habitación hub", () => {
    const a = env("aaaa-1111-1111-1111-111111111111", "Salón");
    const b = env("bbbb-2222-2222-2222-222222222222", "Cocina");
    const c = env("cccc-3333-3333-3333-333333333333", "Dormitorio");
    const site = {
      id: "site-1",
      name: "Piso",
      roomIds: [a.id, b.id, c.id],
      mapLayout: "hub" as const,
      links: [
        {
          id: "l1",
          fromRoomId: a.id,
          toRoomId: b.id,
          label: "A cocina",
          transitionKind: "door" as const,
          confirmed: true,
        },
        {
          id: "l2",
          fromRoomId: a.id,
          toRoomId: c.id,
          label: "A dormitorio",
          transitionKind: "door" as const,
          confirmed: true,
        },
      ],
      createdAt: "",
      updatedAt: "",
      version: 1,
    };
    const proposal = pickSiteProposal(site, [a, b, c], "spatial-site-recorrido")!;
    const room = buildSpatialSiteRoom(site, [a, b, c], proposal, randomUUID());
    expect(room.spatialSiteMap?.mapLayout).toBe("hub");
    const hubScene = room.scenes[`space-${a.id.slice(0, 8)}`]!;
    expect(hubScene.exits?.length).toBeGreaterThanOrEqual(2);
  });
});
