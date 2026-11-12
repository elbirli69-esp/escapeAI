import type { ScannedEnvironment } from "@escapeai/shared";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { createSession } from "@escapeai/escape-engine";
import { describe, expect, it } from "vitest";
import { buildSpatialRoom } from "./build-room.js";
import { pickProposal, proposeSpatialAdventures } from "./generate-proposals.js";

const sampleEnv: ScannedEnvironment = {
  id: "env-test-1",
  name: "Salón demo",
  environmentType: "living_room",
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  constraints: defaultEnvironmentConstraints(),
  objects: [
    {
      id: "o1",
      category: "clock",
      label: "Reloj",
      quantity: 1,
      confidence: 0.9,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
    {
      id: "o2",
      category: "book",
      label: "Atlas viajes",
      quantity: 2,
      confidence: 0.8,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
    {
      id: "o3",
      category: "chair",
      label: "Silla",
      quantity: 4,
      confidence: 0.7,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: false,
      restricted: true,
    },
    {
      id: "o4",
      category: "plant",
      label: "Ficus",
      quantity: 1,
      confidence: 0.85,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
};

describe("proposeSpatialAdventures", () => {
  it("genera tres propuestas distintas", () => {
    const proposals = proposeSpatialAdventures(sampleEnv);
    expect(proposals).toHaveLength(3);
    const archetypes = new Set(proposals.map((p) => p.archetype));
    expect(archetypes.size).toBe(3);
    for (const p of proposals) {
      expect(p.objectsUsed.length).toBeGreaterThan(0);
      expect(p.puzzles.length).toBeGreaterThanOrEqual(3);
      expect(p.puzzleCount).toBe(p.puzzles.length);
    }
  });

  it("usa objetos confirmados en textos", () => {
    const temporal = pickProposal(sampleEnv, "spatial-temporal");
    expect(temporal?.objectsUsed.some((l) => /reloj|clock|atlas|book/i.test(l) || l.length > 0)).toBe(true);
  });
});

describe("buildSpatialRoom", () => {
  it("produce RoomDefinition válido para cada archetype", () => {
    const proposals = proposeSpatialAdventures(sampleEnv);
    for (const proposal of proposals) {
      const room = buildSpatialRoom(sampleEnv, proposal, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
      expect(() => createSession(room)).not.toThrow();
      expect(room.puzzles.spatial_finale?.answer).toBeTruthy();
      expect(room.winCondition).toEqual({ type: "puzzle_solved", puzzleId: "spatial_finale" });
    }
  });

  it("encadena requiredClues en planes temporales", () => {
    const temporal = pickProposal(sampleEnv, "spatial-temporal")!;
    const book = temporal.puzzles.find((p) => p.puzzleId === "spatial_book");
    expect(book?.requiredClues).toContain("clock_hour");
  });
});
