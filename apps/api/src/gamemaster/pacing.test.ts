import { describe, expect, it } from "vitest";
import { getPilotRoom } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import type { GmSessionMeta } from "./persistence.js";
import {
  computeGmPacing,
  detectPaceNudgeTrigger,
  resolveAdaptivePolicy,
} from "./pacing.js";

function metaBase(overrides: Partial<GmSessionMeta> = {}): GmSessionMeta {
  return {
    sequence: 0,
    dedupeKeys: [],
    llmCallCount: 0,
    lastLlmCallMs: 0,
    visitedSceneIds: [],
    lastProgressMs: 0,
    stuckNotifiedPuzzleIds: [],
    characterTurnCount: 0,
    lastCharacterTurnMs: 0,
    paceNudgeIssued: false,
    ...overrides,
  };
}

describe("pacing", () => {
  it("detecta equipo behind", () => {
    const session = createSession(getPilotRoom());
    const now = session.startedAtMs + 40 * 60 * 1000;
    const snap = computeGmPacing(session, now);
    expect(snap.mode).toBe("behind");
  });

  it("emite PACE_NUDGE una vez", () => {
    const session = createSession(getPilotRoom());
    const now = session.startedAtMs + 35 * 60 * 1000;
    const first = detectPaceNudgeTrigger(session, metaBase(), now);
    expect(first?.type).toBe("PACE_NUDGE");
    const second = detectPaceNudgeTrigger(session, metaBase({ paceNudgeIssued: true }), now);
    expect(second).toBeUndefined();
  });

  it("reduce LLM en modo critical", () => {
    const snap = {
      mode: "critical" as const,
      solvedRatio: 0.2,
      elapsedRatio: 0.9,
      tempoDirective: "x",
    };
    expect(resolveAdaptivePolicy("SCENE_ENTERED", "llm_optional", snap)).toBe("static");
    expect(resolveAdaptivePolicy("GAME_WON", "llm_optional", snap)).toBe("llm_optional");
  });
});
