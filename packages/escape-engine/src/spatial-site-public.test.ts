import { describe, expect, it } from "vitest";
import { createSession, toPublicState } from "./session.js";
import type { RoomDefinition } from "./room-definition.js";

const room: RoomDefinition = {
  id: "spatial-site-test",
  name: "Test recinto",
  timeLimitSec: 600,
  startSceneId: "space-aaaaaaaa",
  winCondition: { type: "puzzle_solved", puzzleId: "fin" },
  spatialSiteMap: {
    siteName: "Casa",
    mapLayout: "linear",
    rooms: [
      { inventoryId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", sceneId: "space-aaaaaaaa", label: "Salón" },
    ],
    links: [],
    suggestedVisit: [{ order: 1, label: "Salón", sceneId: "space-aaaaaaaa" }],
  },
  scenes: {
    "space-aaaaaaaa": {
      id: "space-aaaaaaaa",
      title: "Salón",
      description: "Aquí",
      puzzles: [],
      exits: [],
    },
  },
  puzzles: { fin: { id: "fin", type: "code", prompt: "x", answer: "x" } },
};

describe("spatial site public state", () => {
  it("expone etiqueta de habitación activa", () => {
    const session = createSession(room);
    const state = toPublicState(session);
    expect(state.spatialRoomLabel).toBe("Salón");
    expect(state.spatialSiteMap?.siteName).toBe("Casa");
    expect(state.spatialSiteMap?.currentVisitOrder).toBe(1);
  });
});
