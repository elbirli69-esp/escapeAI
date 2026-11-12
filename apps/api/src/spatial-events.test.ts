import { describe, expect, it } from "vitest";
import { pickProposal, proposeSpatialAdventures, buildSpatialRoom } from "@escapeai/escape-content";
import { MemoryScannedEnvironmentStore } from "./scanned-environment-store.js";
import { MemoryEventStore } from "./event-store.js";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { randomUUID } from "node:crypto";

const payload = {
  name: "Sala espacial",
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
    {
      id: "b1",
      category: "book" as const,
      quantity: 1,
      confidence: 0.8,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
  constraints: defaultEnvironmentConstraints(),
};

describe("spatial adventure API flow", () => {
  it("genera sala determinista enlazada al snapshot del inventario", async () => {
    const scanStore = new MemoryScannedEnvironmentStore();
    const eventStore = new MemoryEventStore();
    const env = await scanStore.create(payload);
    const proposals = proposeSpatialAdventures(env);
    expect(proposals).toHaveLength(3);

    const proposal = pickProposal(env, "spatial-temporal")!;
    const eventId = randomUUID();
    const room = buildSpatialRoom(env, proposal, eventId);
    await eventStore.create({
      eventId,
      joinCode: "AAA111",
      createdAtMs: Date.now(),
      config: {
        adventureType: "team",
        teamCount: 2,
        subject: { name: env.name },
        facts: ["test"],
        scannedEnvironmentId: env.id,
        inventoryVersion: env.version,
        spatialProposalId: proposal.id,
      },
      title: proposal.title,
      room,
      teams: {},
    });

    await scanStore.update(env.id, { ...payload, name: "Sala modificada" });
    const eventAfter = await eventStore.getByCode("AAA111");
    expect(eventAfter?.room.name).toBe(proposal.title);
    expect(eventAfter?.config.inventoryVersion).toBe(1);
  });
});
