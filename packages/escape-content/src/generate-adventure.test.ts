import { describe, expect, it } from "vitest";
import type { CreateEventRequest } from "@escapeai/shared";
import { generateAdventureRoom } from "./generate-adventure.js";

const baseInput: CreateEventRequest = {
  adventureType: "birthday",
  playerCount: 8,
  subject: { name: "Ada Lovelace", age: 36, nickname: "Ada" },
  facts: ["Nació en 1815", "Le gustan los puzzles"],
};

describe("generateAdventureRoom", () => {
  it("es determinista con el mismo eventId", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const a = generateAdventureRoom(baseInput, id);
    const b = generateAdventureRoom(baseInput, id);
    expect(a).toEqual(b);
  });

  it("genera códigos coherentes con edad y nombre", () => {
    const room = generateAdventureRoom(baseInput, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(room.puzzles.entry_lock.answer).toBe(String(new Date().getFullYear() - 36));
    expect(room.puzzles.final_code.answer).toBe("ALAE");
  });
});
