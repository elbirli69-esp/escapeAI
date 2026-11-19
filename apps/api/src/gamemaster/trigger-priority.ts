import type { GmProcessTrigger, GmTriggerType } from "@escapeai/shared";

/** Menor = más prioritario (Fase D del plan diálogo ER). */
const TRIGGER_PRIORITY: Partial<Record<GmTriggerType, number>> = {
  GAME_WON: 0,
  GAME_LOST: 0,
  HINT_GRANTED: 10,
  PUZZLE_SOLVED: 15,
  TIME_WARNING: 20,
  TEAM_STUCK: 30,
  PACE_NUDGE: 35,
  DIRECTOR_FAQ: 40,
  CHARACTER_TURN: 45,
  PUZZLE_FAILED: 50,
  SESSION_STARTED: 60,
  SCENE_ENTERED: 70,
  ITEM_TAKEN: 80,
  PASSAGE_UNLOCKED: 80,
};

export function sortTriggersByPriority(triggers: GmProcessTrigger[]): GmProcessTrigger[] {
  return [...triggers].sort(
    (a, b) => (TRIGGER_PRIORITY[a.type] ?? 55) - (TRIGGER_PRIORITY[b.type] ?? 55),
  );
}