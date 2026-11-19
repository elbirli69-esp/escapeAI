import { describe, expect, it } from "vitest";
import { getPilotRoom } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import type { GmProcessTrigger } from "@escapeai/shared";
import { filterOrchestrationTriggers } from "./orchestration.js";

describe("orchestration (casos G–I)", () => {
  const session = createSession(getPilotRoom());

  it("Caso G: un solo banner entre PACE_NUDGE y TEAM_STUCK", () => {
    const triggers: GmProcessTrigger[] = [
      { type: "PACE_NUDGE", sourceEventId: "p" },
      { type: "TEAM_STUCK", sourceEventId: "s", payload: { puzzleId: "entry_lock" } },
    ];
    const out = filterOrchestrationTriggers(triggers, session);
    const banners = out.filter((t) => t.type === "PACE_NUDGE" || t.type === "TEAM_STUCK");
    expect(banners).toHaveLength(1);
    expect(banners[0]!.type).toBe("TEAM_STUCK");
  });

  it("Caso H: PUZZLE_SOLVED suprime TEAM_STUCK del mismo puzzle; HINT_GRANTED permanece", () => {
    const triggers: GmProcessTrigger[] = [
      { type: "HINT_GRANTED", sourceEventId: "h", payload: { puzzleId: "entry_lock", level: 1 } },
      { type: "PUZZLE_SOLVED", sourceEventId: "w", payload: { puzzleId: "entry_lock" } },
      { type: "TEAM_STUCK", sourceEventId: "s", payload: { puzzleId: "entry_lock" } },
    ];
    const out = filterOrchestrationTriggers(triggers, session);
    expect(out.some((t) => t.type === "HINT_GRANTED")).toBe(true);
    expect(out.some((t) => t.type === "PUZZLE_SOLVED")).toBe(true);
    expect(out.some((t) => t.type === "TEAM_STUCK")).toBe(false);
  });

  it("Caso I: victoria elimina stuck y pace del batch", () => {
    const triggers: GmProcessTrigger[] = [
      { type: "GAME_WON", sourceEventId: "g" },
      { type: "TEAM_STUCK", sourceEventId: "s", payload: { puzzleId: "entry_lock" } },
      { type: "PACE_NUDGE", sourceEventId: "p" },
    ];
    session.status = "won";
    const out = filterOrchestrationTriggers(triggers, session);
    expect(out.map((t) => t.type)).toEqual(["GAME_WON"]);
    session.status = "playing";
  });
});