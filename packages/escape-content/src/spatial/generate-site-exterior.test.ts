import { describe, expect, it } from "vitest";
import { proposeSiteAdventures, pickSiteProposal } from "./generate-site-proposals.js";
import { buildSpatialSiteRoom } from "./build-site-room.js";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { randomUUID } from "node:crypto";

const mk = (name: string, type: "living_room" | "exterior", id: string) => ({
  id,
  name,
  environmentType: type,
  objects: [
    {
      id: "p1",
      category: "plant" as const,
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

describe("site exterior proposals", () => {
  it("sustituye propuesta urbana por interior+exterior", () => {
    const indoor = mk("Salón", "living_room", "in1");
    const outdoor = mk("Portal", "exterior", "out1");
    const site = {
      id: "s1",
      name: "Casa",
      roomIds: [indoor.id, outdoor.id],
      links: [
        {
          id: "l1",
          fromRoomId: indoor.id,
          toRoomId: outdoor.id,
          label: "Salir",
          transitionKind: "open" as const,
          confirmed: true,
        },
      ],
      mapLayout: "linear" as const,
      outdoorRoomId: outdoor.id,
      geoContext: { city: "Valencia" },
      createdAt: "",
      updatedAt: "",
      version: 1,
    };
    const proposals = proposeSiteAdventures(site, [indoor, outdoor]);
    expect(proposals.map((p) => p.id)).toContain("spatial-site-exterior");
    expect(proposals.map((p) => p.id)).not.toContain("spatial-site-urban");

    const proposal = pickSiteProposal(site, [indoor, outdoor], "spatial-site-exterior")!;
    const room = buildSpatialSiteRoom(site, [indoor, outdoor], proposal, randomUUID());
    expect(room.spatialSiteMap?.suggestedVisit.some((s) => s.kind === "outdoor")).toBe(true);
    expect(room.puzzles.site_outdoor_cam).toBeDefined();
  });
});
