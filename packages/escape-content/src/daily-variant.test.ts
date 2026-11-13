import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoomFromFile } from "@escapeai/escape-engine";
import { describe, expect, it } from "vitest";
import { applyCatalogDailyVariant } from "./daily-variant.js";

const roomsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "rooms");

describe("catalog daily variant", () => {
  it("misma semilla de día produce misma variante", () => {
    const base = loadRoomFromFile(join(roomsDir, "pilot.yaml"));
    const day = new Date("2026-03-15T12:00:00Z");
    const a = applyCatalogDailyVariant(base, "pilot", day);
    const b = applyCatalogDailyVariant(base, "pilot", day);
    expect(a.timeLimitSec).toBe(b.timeLimitSec);
    expect(a.scenes.entrance.mood).toBe(b.scenes.entrance.mood);
  });

  it("días distintos pueden variar tiempo", () => {
    const base = loadRoomFromFile(join(roomsDir, "pilot.yaml"));
    const a = applyCatalogDailyVariant(base, "pilot", new Date("2026-01-01T00:00:00Z"));
    const b = applyCatalogDailyVariant(base, "pilot", new Date("2026-06-01T00:00:00Z"));
    const times = new Set([a.timeLimitSec, b.timeLimitSec]);
    expect(times.size).toBeGreaterThanOrEqual(1);
  });
});
