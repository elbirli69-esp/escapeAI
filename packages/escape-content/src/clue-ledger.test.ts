import { describe, expect, it } from "vitest";
import { auditGeneratedClueLedger } from "./audit-coherence.js";
import { generateAdventureRoom } from "./generate-adventure.js";

describe("generated clue ledger", () => {
  for (const adventureType of ["birthday", "celebration", "mystery", "team"] as const) {
    it(`${adventureType}: token_slot enlaza acto 1`, () => {
      const room = generateAdventureRoom({
        adventureType,
        teamCount: 2,
        subject: { name: "Luna Pérez", nickname: "Luna" },
        facts: ["Dato A", "Dato B"],
        hybridPlayMode: "mobile_only",
      });
      const audit = auditGeneratedClueLedger(room);
      expect(audit.ok).toBe(true);
      const blob = (room.puzzles.token_slot?.interactionHints ?? []).join(" ");
      expect(blob).toMatch(/numeric_prefix|salon_photo_ok|candado|pista/i);
    });
  }
});