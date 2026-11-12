import { describe, expect, it } from "vitest";
import type { RoomCharacter } from "@escapeai/escape-engine";
import { characterUsesSpokenPresentation } from "./characters.js";

describe("characterUsesSpokenPresentation", () => {
  const base: RoomCharacter = {
    id: "x",
    displayName: "Test",
    voiceTone: "Seco",
  };

  it("activa tts con spokenReplies true", () => {
    expect(characterUsesSpokenPresentation({ ...base, spokenReplies: true })).toBe(true);
  });

  it("desactiva con spokenReplies false", () => {
    expect(characterUsesSpokenPresentation({ ...base, spokenReplies: false })).toBe(false);
  });
});
