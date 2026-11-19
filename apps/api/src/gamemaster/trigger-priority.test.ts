import { describe, expect, it } from "vitest";
import type { GmProcessTrigger } from "@escapeai/shared";
import { sortTriggersByPriority } from "./trigger-priority.js";

describe("sortTriggersByPriority", () => {
  it("prioriza GAME_WON sobre TEAM_STUCK", () => {
    const triggers: GmProcessTrigger[] = [
      { type: "TEAM_STUCK", sourceEventId: "a", payload: { puzzleId: "x" } },
      { type: "GAME_WON", sourceEventId: "b" },
    ];
    const sorted = sortTriggersByPriority(triggers);
    expect(sorted[0]!.type).toBe("GAME_WON");
  });
});