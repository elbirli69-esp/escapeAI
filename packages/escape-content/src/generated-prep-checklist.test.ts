import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "./generate-adventure.js";
import {
  buildGeneratedPrepChecklist,
  countHybridStations,
  posterKeywordForOrganizer,
} from "./generated-prep-checklist.js";

const base = {
  adventureType: "birthday" as const,
  teamCount: 2,
  subject: { name: "Ada", nickname: "Ada" },
  facts: ["Nació en 1815"],
};

const eventId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("generated prep (P5-C)", () => {
  it("incluye token y cartel en modo room", () => {
    const room = generateAdventureRoom(base, eventId);
    const list = buildGeneratedPrepChecklist(room, { joinCode: "AB12", hybridPlayMode: "room" });
    expect(list.some((i) => i.kind === "organizer_setup" && /recuerdo/i.test(i.text))).toBe(true);
    expect(list.some((i) => /cartel|A5/i.test(i.text))).toBe(true);
    expect(posterKeywordForOrganizer(room)).toHaveLength(2);
  });

  it("modo mobile_only evita montaje físico del token", () => {
    const room = generateAdventureRoom({ ...base, hybridPlayMode: "mobile_only" }, eventId);
    expect(room.items?.token?.takeRequiresPuzzleSolved).toBeUndefined();
    const list = buildGeneratedPrepChecklist(room, { joinCode: "AB12", hybridPlayMode: "mobile_only" });
    expect(list.some((i) => /solo móvil/i.test(i.text))).toBe(true);
  });

  it("≥2 estaciones híbridas por tipo birthday", () => {
    const room = generateAdventureRoom(base, eventId);
    expect(countHybridStations(room)).toBeGreaterThanOrEqual(2);
  });
});