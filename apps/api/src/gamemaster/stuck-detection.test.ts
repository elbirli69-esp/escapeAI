import { describe, expect, it } from "vitest";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import type { GmSessionMeta } from "./persistence.js";
import {
  detectTeamStuckTrigger,
  markStuckNotified,
  updateProgressMeta,
} from "./stuck-detection.js";

function metaBase(overrides: Partial<GmSessionMeta> = {}): GmSessionMeta {
  return {
    sequence: 0,
    dedupeKeys: [],
    llmCallCount: 0,
    lastLlmCallMs: 0,
    visitedSceneIds: [],
    lastProgressMs: 0,
    stuckNotifiedPuzzleIds: [],
    ...overrides,
  };
}

function loadRoom() {
  return generateAdventureRoom(
    {
      adventureType: "birthday",
      teamCount: 2,
      durationMin: 45,
      subject: { name: "Test" },
      facts: ["fact A"],
    },
    "dddddddd-dddd-dddd-dddd-dddddddddddd",
  );
}

describe("stuck-detection", () => {
  it("detecta bloqueo por intentos e inactividad", () => {
    const room = loadRoom();
    const session = createSession(room);
    const puzzleId = "entry_lock";
    session.puzzleAttempts.set(puzzleId, 3);

    const now = 10_000;
    const meta = metaBase({
      focusedPuzzleId: puzzleId,
      lastProgressMs: now - 5 * 60 * 1000,
    });

    const trigger = detectTeamStuckTrigger(session, meta, now);
    expect(trigger?.type).toBe("TEAM_STUCK");
    expect(trigger?.payload?.puzzleId).toBe(puzzleId);
  });

  it("no repite TEAM_STUCK para el mismo puzzle", () => {
    const room = loadRoom();
    const session = createSession(room);
    const puzzleId = "entry_lock";
    session.puzzleAttempts.set(puzzleId, 5);

    const meta = metaBase({
      focusedPuzzleId: puzzleId,
      lastProgressMs: 0,
      stuckNotifiedPuzzleIds: [puzzleId],
    });

    expect(detectTeamStuckTrigger(session, meta, Date.now())).toBeUndefined();
  });

  it("actualiza foco y progreso tras fallos", () => {
    const room = loadRoom();
    const session = createSession(room);
    const base = metaBase();
    const next = updateProgressMeta(
      session,
      { type: "submit_answer", puzzleId: "entry_lock", value: "x" },
      [{ type: "puzzle_failed", puzzleId: "entry_lock", attempts: 2 }],
      base,
      1000,
    );
    expect(next.focusedPuzzleId).toBe("entry_lock");
    expect(next.lastProgressMs).toBe(0);

    const progressed = updateProgressMeta(
      session,
      { type: "move", sceneId: session.room.startSceneId },
      [{ type: "scene_entered", sceneId: session.room.startSceneId }],
      next,
      2000,
    );
    expect(progressed.lastProgressMs).toBe(2000);

    const cleared = updateProgressMeta(
      session,
      { type: "submit_answer", puzzleId: "entry_lock", value: "ok" },
      [{ type: "puzzle_solved", puzzleId: "entry_lock" }],
      { ...progressed, stuckNotifiedPuzzleIds: ["entry_lock"] },
      3000,
    );
    expect(cleared.stuckNotifiedPuzzleIds).not.toContain("entry_lock");
  });

  it("markStuckNotified es idempotente", () => {
    const m1 = markStuckNotified(metaBase(), "entry_lock");
    const m2 = markStuckNotified(m1, "entry_lock");
    expect(m2.stuckNotifiedPuzzleIds).toEqual(["entry_lock"]);
  });
});
