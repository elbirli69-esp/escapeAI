import { describe, expect, it } from "vitest";
import type { CreateEventRequest } from "@escapeai/shared";
import { generateAdventureRoom } from "./generate-adventure.js";

const baseInput: CreateEventRequest = {
  adventureType: "birthday",
  teamCount: 4,
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

  it("registra beats y grantClue en sound y entry_lock", () => {
    const room = generateAdventureRoom(baseInput, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(room.beats?.length).toBeGreaterThanOrEqual(3);
    expect(room.puzzles.sound_intro?.onSolve?.grantClue?.id).toBe("numeric_prefix");
    expect(room.puzzles.entry_lock?.onSolve?.grantClue).toBeTruthy();
  });

  it("genera códigos coherentes con edad y nombre", () => {
    const room = generateAdventureRoom(baseInput, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(room.puzzles.entry_lock.answer).toBe("1815");
    expect(room.puzzles.final_code.answer).toBe("ALAE");
  });

  it("mystery y team tienen arcos de escena distintos y finale guiado", () => {
    const mystery = generateAdventureRoom(
      { ...baseInput, adventureType: "mystery" },
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    const team = generateAdventureRoom(
      { ...baseInput, adventureType: "team" },
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    expect(mystery.scenes.start.title).not.toBe(team.scenes.start.title);
    expect(mystery.scenes.finale.description).toMatch(/opcional/i);
    expect(team.scenes.finale.description).toMatch(/ranking|victoria/i);
    expect(mystery.puzzles.voice_seal?.prompt).toMatch(/Opcional/i);
  });

  it("sound_intro procedural con tts o beeps", () => {
    const room = generateAdventureRoom(baseInput, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    const sound = room.puzzles.sound_intro;
    expect(sound.answer).toBe("18");
    if (sound.soundMode === "tts") {
      expect(sound.ttsText).toMatch(/uno|ocho|18|18/i);
    } else {
      expect(sound.soundMode).toBe("beeps");
      expect(sound.beepPattern?.length).toBeGreaterThan(4);
    }
    expect(sound.interactionHints?.length).toBeGreaterThan(0);
  });
});
