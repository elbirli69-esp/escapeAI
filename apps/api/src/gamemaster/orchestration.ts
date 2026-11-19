import type { SessionRecord } from "@escapeai/escape-engine";
import type { GmProcessTrigger, GmTriggerType } from "@escapeai/shared";
import { sortTriggersByPriority } from "./trigger-priority.js";

const BANNER_TYPES = new Set<GmTriggerType>(["TIME_WARNING", "TEAM_STUCK", "PACE_NUDGE"]);

/** Fase D: coalesce triggers antes de render (plan §6.2, casos G–I). */
export function filterOrchestrationTriggers(
  triggers: GmProcessTrigger[],
  session: SessionRecord,
): GmProcessTrigger[] {
  let out = [...triggers];

  const solvedIds = new Set(
    out
      .filter((t) => t.type === "PUZZLE_SOLVED")
      .map((t) => String(t.payload?.puzzleId ?? ""))
      .filter(Boolean),
  );
  for (const puzzleId of session.solvedPuzzles) {
    solvedIds.add(puzzleId);
  }

  if (solvedIds.size > 0) {
    out = out.filter((t) => {
      if (t.type !== "TEAM_STUCK") return true;
      const pid = String(t.payload?.puzzleId ?? "");
      return !solvedIds.has(pid);
    });
  }

  const hasTerminal =
    out.some((t) => t.type === "GAME_WON" || t.type === "GAME_LOST") ||
    session.status !== "playing";
  if (hasTerminal) {
    out = out.filter(
      (t) =>
        t.type !== "TEAM_STUCK" &&
        t.type !== "PACE_NUDGE" &&
        t.type !== "DIRECTOR_FAQ",
    );
  }

  const banners = out.filter((t) => BANNER_TYPES.has(t.type));
  if (banners.length > 1) {
    const winner = sortTriggersByPriority(banners)[0]!;
    let keptBanner = false;
    out = out.filter((t) => {
      if (!BANNER_TYPES.has(t.type)) return true;
      if (t.type !== winner.type) return false;
      if (keptBanner) return false;
      keptBanner = true;
      return true;
    });
  }

  return out;
}