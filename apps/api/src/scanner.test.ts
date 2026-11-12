import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import { MemoryScannedEnvironmentStore } from "./scanned-environment-store.js";
import { defaultEnvironmentConstraints } from "@escapeai/shared";
import { MemoryEventStore, type StoredEvent } from "./event-store.js";

const samplePayload = {
  name: "Salón prueba",
  environmentType: "living_room" as const,
  objects: [
    {
      id: "obj-1",
      category: "sofa" as const,
      quantity: 1,
      confidence: 0.85,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: false,
      restricted: false,
    },
  ],
  constraints: defaultEnvironmentConstraints(),
  scanMetadata: { captureCount: 3, detectorId: "coco-ssd-lite-mobilenet-v2" },
};

describe("ScannedEnvironmentStore", () => {
  it("crea y recupera inventario", async () => {
    const store = new MemoryScannedEnvironmentStore();
    const created = await store.create(samplePayload);
    expect(created.id).toBeTruthy();
    expect(created.version).toBe(1);
    const loaded = await store.getById(created.id);
    expect(loaded?.objects[0]?.category).toBe("sofa");
  });

  it("incrementa versión al actualizar sin tocar eventos", async () => {
    const scanStore = new MemoryScannedEnvironmentStore();
    const eventStore = new MemoryEventStore();
    const created = await scanStore.create(samplePayload);

    const eventBody: CreateEventRequest = {
      adventureType: "team",
      teamCount: 2,
      subject: { name: "Grupo Test" },
      facts: ["Dato uno"],
    };
    const eventId = randomUUID();
    const room = generateAdventureRoom(eventBody, eventId);
    const roomNameBefore = room.name;
    const event: StoredEvent = {
      eventId,
      joinCode: "ABC123",
      createdAtMs: Date.now(),
      config: eventBody,
      title: room.name,
      room,
      teams: {},
    };
    await eventStore.create(event);

    await scanStore.update(created.id, {
      ...samplePayload,
      name: "Salón modificado",
      objects: [
        {
          ...samplePayload.objects[0]!,
          category: "clock",
          label: "Reloj grande",
        },
      ],
    });

    const updatedScan = await scanStore.getById(created.id);
    expect(updatedScan?.name).toBe("Salón modificado");
    expect(updatedScan?.version).toBe(2);

    const eventAfter = await eventStore.getByCode("ABC123");
    expect(eventAfter?.room.name).toBe(roomNameBefore);
    expect(eventAfter?.room.puzzles).toEqual(room.puzzles);
  });

  it("lista resúmenes", async () => {
    const store = new MemoryScannedEnvironmentStore();
    await store.create(samplePayload);
    const list = await store.listSummaries();
    expect(list.length).toBe(1);
    expect(list[0]?.confirmedCount).toBe(1);
  });
});
