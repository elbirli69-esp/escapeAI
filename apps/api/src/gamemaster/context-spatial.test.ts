import { describe, expect, it } from "vitest";
import { buildSpatialSiteRoom, pickSiteProposal } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { buildGmViewContext } from "./context.js";

const salon = {
  id: "aaaa-1111-1111-1111-111111111111",
  name: "Salón",
  environmentType: "living_room" as const,
  version: 1,
  createdAt: "",
  updatedAt: "",
  constraints: defaultEnvironmentConstraints(),
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
};

const cocina = { ...salon, id: "bbbb-2222-2222-2222-222222222222", name: "Cocina" };

describe("buildGmViewContext spatial", () => {
  it("expone spatialSiteSummary con visitas", () => {
    const site = {
      id: "site-1",
      name: "Piso QA",
      roomIds: [salon.id, cocina.id],
      links: [
        {
          id: "l1",
          fromRoomId: salon.id,
          toRoomId: cocina.id,
          label: "Puerta",
          transitionKind: "door" as const,
          confirmed: true,
        },
      ],
      mapLayout: "linear" as const,
      version: 1,
      createdAt: "",
      updatedAt: "",
    };
    const proposal = pickSiteProposal(site, [salon, cocina], "spatial-site-recorrido")!;
    const room = buildSpatialSiteRoom(site, [salon, cocina], proposal, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    const startScene = room.startSceneId;
    const session = createSession(room);
    session.currentSceneId = `space-${salon.id.slice(0, 8)}`;
    const ctx = buildGmViewContext(session, [], [startScene, session.currentSceneId], []);
    expect(ctx.spatialSiteSummary?.siteName).toBe("Piso QA");
    expect(ctx.spatialSiteSummary?.totalRooms).toBe(2);
    expect(ctx.authorizedNarrativeFacts.some((f) => f.includes("Piso QA"))).toBe(true);
  });
});
