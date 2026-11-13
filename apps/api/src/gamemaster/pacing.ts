import type { SessionRecord } from "@escapeai/escape-engine";
import { toPublicState } from "@escapeai/escape-engine";
import type { GmPacingMode, GmProcessTrigger } from "@escapeai/shared";
import { randomUUID } from "node:crypto";
import type { GmSessionMeta } from "./persistence.js";
import type { TriggerMode } from "./triggers.js";

export type GmPacingSnapshot = {
  mode: GmPacingMode;
  solvedRatio: number;
  elapsedRatio: number;
  tempoDirective: string;
};

function countPuzzles(session: SessionRecord): number {
  return Object.keys(session.room.puzzles).length;
}

/** Ritmo del equipo respecto al reloj (heurística, sin LLM). */
export function computeGmPacing(session: SessionRecord, nowMs = Date.now()): GmPacingSnapshot {
  const state = toPublicState(session, nowMs);
  const total = Math.max(1, countPuzzles(session));
  const solvedRatio = session.solvedPuzzles.size / total;
  const elapsedRatio = state.elapsedSec / Math.max(1, state.timeLimitSec);
  const remainingRatio = state.timeRemainingSec / Math.max(1, state.timeLimitSec);

  let mode: GmPacingMode = "steady";
  if (remainingRatio <= 0.12 && session.status === "playing") {
    mode = "critical";
  } else if (solvedRatio + 0.15 < elapsedRatio) {
    mode = "behind";
  } else if (solvedRatio >= elapsedRatio + 0.12) {
    mode = "ahead";
  }

  const tempoDirective =
    mode === "ahead"
      ? "Tono pausado y alentador; el equipo va con buen ritmo."
      : mode === "behind"
        ? "Tono de director práctico; sugiere priorizar retos abiertos sin spoilear."
        : mode === "critical"
          ? "Máxima brevedad; recuerda el tiempo restante sin alarmismo."
          : "Tono neutro e inmersivo.";

  return { mode, solvedRatio, elapsedRatio, tempoDirective };
}

const LOW_PRIORITY_LLM = new Set([
  "SCENE_ENTERED",
  "ITEM_TAKEN",
  "PASSAGE_UNLOCKED",
  "SESSION_STARTED",
]);

export function resolveAdaptivePolicy(
  triggerType: string,
  basePolicy: TriggerMode,
  pacing: GmPacingSnapshot,
): TriggerMode {
  if (basePolicy === "silent") return "silent";
  if (basePolicy !== "llm_optional") return basePolicy;

  if (pacing.mode === "critical") {
    if (LOW_PRIORITY_LLM.has(triggerType)) return "static";
  } else if (pacing.mode === "behind") {
    if (triggerType === "SCENE_ENTERED" || triggerType === "ITEM_TAKEN") return "static";
  }
  return basePolicy;
}

const PACE_NUDGE_MIN_ELAPSED = Number(process.env.GM_PACE_NUDGE_MIN_ELAPSED ?? 0.3);

export function detectPaceNudgeTrigger(
  session: SessionRecord,
  meta: GmSessionMeta,
  nowMs = Date.now(),
): GmProcessTrigger | undefined {
  if (session.status !== "playing") return undefined;
  if (meta.paceNudgeIssued) return undefined;

  const pacing = computeGmPacing(session, nowMs);
  if (pacing.mode !== "behind" && pacing.mode !== "critical") return undefined;
  if (pacing.elapsedRatio < PACE_NUDGE_MIN_ELAPSED) return undefined;
  if (pacing.solvedRatio >= pacing.elapsedRatio - 0.08) return undefined;

  return {
    type: "PACE_NUDGE",
    sourceEventId: randomUUID(),
    payload: {
      pacingMode: pacing.mode,
      solvedPct: Math.round(pacing.solvedRatio * 100),
      elapsedPct: Math.round(pacing.elapsedRatio * 100),
    },
  };
}

export function markPaceNudgeIssued(meta: GmSessionMeta): GmSessionMeta {
  return { ...meta, paceNudgeIssued: true };
}
