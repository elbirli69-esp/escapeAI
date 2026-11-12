import { getExitAvailability, type SessionRecord } from "@escapeai/escape-engine";
import type { GameAction, GameEvent, GmProcessTrigger } from "@escapeai/shared";
import { randomUUID } from "node:crypto";

export type ExitSnapshot = Array<{ toSceneId: string; label: string; available: boolean }>;

export type TriggerMode = "static" | "llm_optional" | "silent";

export const TRIGGER_POLICY: Record<string, TriggerMode> = {
  SESSION_STARTED: "llm_optional",
  SCENE_ENTERED: "llm_optional",
  PUZZLE_SOLVED: "static",
  PUZZLE_FAILED: "silent",
  ITEM_TAKEN: "static",
  PASSAGE_UNLOCKED: "static",
  GAME_WON: "llm_optional",
  GAME_LOST: "llm_optional",
  TIME_WARNING: "static",
  HINT_REQUESTED: "silent",
  TEAM_STUCK: "static",
  HINT_GRANTED: "llm_optional",
};

export function collectTriggersFromGameplay(input: {
  action: GameAction;
  gameEvents: GameEvent[];
  beforeExits: ExitSnapshot;
  afterSession: SessionRecord;
}): GmProcessTrigger[] {
  const { action, gameEvents, beforeExits, afterSession } = input;
  const triggers: GmProcessTrigger[] = [];

  const hintEv = gameEvents.find((e) => e.type === "hint_requested");
  if (hintEv && hintEv.type === "hint_requested") {
    return [
      {
        type: "HINT_GRANTED",
        sourceEventId: randomUUID(),
        payload: { puzzleId: hintEv.puzzleId, level: hintEv.level },
      },
    ];
  }

  for (const ev of gameEvents) {
    const sourceEventId = randomUUID();
    switch (ev.type) {
      case "scene_entered":
        triggers.push({
          type: "SCENE_ENTERED",
          sourceEventId,
          payload: { sceneId: ev.sceneId },
        });
        break;
      case "puzzle_solved":
        triggers.push({
          type: "PUZZLE_SOLVED",
          sourceEventId,
          payload: { puzzleId: ev.puzzleId },
        });
        break;
      case "puzzle_failed":
        triggers.push({
          type: "PUZZLE_FAILED",
          sourceEventId,
          payload: { puzzleId: ev.puzzleId, attempts: ev.attempts },
        });
        break;
      case "game_won":
        triggers.push({ type: "GAME_WON", sourceEventId });
        break;
      case "game_lost":
        triggers.push({ type: "GAME_LOST", sourceEventId });
        break;
      default:
        break;
    }
  }

  if (action.type === "take_item") {
    triggers.push({
      type: "ITEM_TAKEN",
      sourceEventId: randomUUID(),
      payload: { itemId: action.itemId },
    });
  }

  const unlocked = detectPassageUnlocked(beforeExits, getExitAvailability(afterSession));
  if (unlocked) {
    triggers.push({
      type: "PASSAGE_UNLOCKED",
      sourceEventId: randomUUID(),
      payload: { sceneId: unlocked.toSceneId, label: unlocked.label },
    });
  }

  return dedupeTriggers(triggers);
}

export function detectPassageUnlocked(
  before: ExitSnapshot,
  after: ExitSnapshot,
): { toSceneId: string; label: string } | undefined {
  const fromBefore = new Map(before.map((e) => [e.toSceneId, e.available]));
  for (const exit of after) {
    const was = fromBefore.get(exit.toSceneId) ?? false;
    if (!was && exit.available) {
      return { toSceneId: exit.toSceneId, label: exit.label };
    }
  }
  return undefined;
}

function dedupeTriggers(triggers: GmProcessTrigger[]): GmProcessTrigger[] {
  const seen = new Set<string>();
  const out: GmProcessTrigger[] = [];
  for (const t of triggers) {
    const key = `${t.type}:${t.payload?.puzzleId ?? t.payload?.sceneId ?? t.payload?.itemId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function sessionStartedTrigger(): GmProcessTrigger {
  return { type: "SESSION_STARTED", sourceEventId: randomUUID() };
}
