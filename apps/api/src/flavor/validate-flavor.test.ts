import { generateAdventureRoom } from "@escapeai/escape-content";
import type { CreateEventRequest } from "@escapeai/shared";
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { applyValidatedFlavor } from "./apply-flavor.js";
import { collectRoomSecrets, validateFlavorText } from "./validate-flavor.js";

const sampleEvent: CreateEventRequest = {
  adventureType: "mystery",
  teamCount: 3,
  subject: { name: "Luis" },
  facts: ["Puerto", "1999", "Llave roja"],
};

describe("flavor validation", () => {
  it("rechaza texto con respuesta de puzzle", () => {
    const room = generateAdventureRoom(sampleEvent, randomUUID());
    const secrets = collectRoomSecrets(room);
    const leak = `La clave es ${room.puzzles.entry_lock.answer}`;
    expect(validateFlavorText(leak, secrets)).toBeDefined();
  });

  it("revierte reescritura insegura", () => {
    const room = generateAdventureRoom(sampleEvent, randomUUID());
    const original = room.scenes.start.description;
    const safe = applyValidatedFlavor(room, {
      rewrite: (_field, text) => `${text} Respuesta ${room.puzzles.entry_lock.answer}`,
    });
    expect(safe.scenes.start.description).toBe(original);
  });
});
