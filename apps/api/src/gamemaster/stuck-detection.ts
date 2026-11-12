import type { SessionRecord } from "@escapeai/escape-engine";
import type { GameAction, GameEvent, GmProcessTrigger } from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import type { GmSessionMeta } from "./persistence.js";
import { hasProgressEvent, isPuzzleActiveInScene, primaryOpenPuzzleId } from "./hints.js";

const STUCK_MIN_ATTEMPTS = Number(process.env.GM_STUCK_MIN_ATTEMPTS ?? 3);
const STUCK_IDLE_MS = Number(process.env.GM_STUCK_IDLE_MS ?? 4 * 60 * 1000);
const STUCK_FAST_ATTEMPTS = Number(process.env.GM_STUCK_FAST_ATTEMPTS ?? 5);

export function updateProgressMeta(
  session: SessionRecord,
  action: GameAction,
  events: GameEvent[],
  meta: GmSessionMeta,
  nowMs = Date.now(),
): GmSessionMeta {
  const next = { ...meta, stuckNotifiedPuzzleIds: [...meta.stuckNotifiedPuzzleIds] };

  if (events.some((e) => e.type === "puzzle_failed")) {
    const fail = events.find((e) => e.type === "puzzle_failed");
    if (fail && fail.type === "puzzle_failed") {
      next.focusedPuzzleId = fail.puzzleId;
    }
  } else if (action.type === "submit_answer") {
    next.focusedPuzzleId = action.puzzleId;
  }

  if (
    hasProgressEvent(events) ||
    action.type === "take_item" ||
    action.type === "move" ||
    action.type === "complete_interaction"
  ) {
    next.lastProgressMs = nowMs;
  }

  if (events.some((e) => e.type === "puzzle_solved")) {
    const solved = events.find((e) => e.type === "puzzle_solved");
    if (solved && solved.type === "puzzle_solved") {
      next.stuckNotifiedPuzzleIds = next.stuckNotifiedPuzzleIds.filter((id) => id !== solved.puzzleId);
    }
  }

  return next;
}

export function detectTeamStuckTrigger(
  session: SessionRecord,
  meta: GmSessionMeta,
  nowMs = Date.now(),
): GmProcessTrigger | undefined {
  if (session.status !== "playing") return undefined;

  const puzzleId = meta.focusedPuzzleId ?? primaryOpenPuzzleId(session);
  if (!puzzleId) return undefined;
  if (!isPuzzleActiveInScene(session, puzzleId)) return undefined;
  if (session.solvedPuzzles.has(puzzleId)) return undefined;
  if (meta.stuckNotifiedPuzzleIds.includes(puzzleId)) return undefined;

  const puzzle = session.room.puzzles[puzzleId];
  const attempts = session.puzzleAttempts.get(puzzleId) ?? 0;
  const hintsUsed = session.puzzleHintsUsed.get(puzzleId) ?? 0;
  const maxHints = puzzle?.maxHints ?? puzzle?.hints?.length ?? 0;
  if (hintsUsed >= maxHints) return undefined;

  const idleMs = nowMs - meta.lastProgressMs;
  const stuckByAttempts = attempts >= STUCK_FAST_ATTEMPTS;
  const stuckByIdle = attempts >= STUCK_MIN_ATTEMPTS && idleMs >= STUCK_IDLE_MS;
  if (!stuckByAttempts && !stuckByIdle) return undefined;

  return {
    type: "TEAM_STUCK",
    sourceEventId: randomUUID(),
    payload: { puzzleId, attempts, idleSec: Math.floor(idleMs / 1000) },
  };
}

export function markStuckNotified(meta: GmSessionMeta, puzzleId: string): GmSessionMeta {
  if (meta.stuckNotifiedPuzzleIds.includes(puzzleId)) return meta;
  return {
    ...meta,
    stuckNotifiedPuzzleIds: [...meta.stuckNotifiedPuzzleIds, puzzleId],
  };
}
