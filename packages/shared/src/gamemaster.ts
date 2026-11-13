import type { AdventureType } from "./events.js";

export type NarrativeChannel = "narration" | "character" | "hint" | "organizer" | "notification";

export type NarrativePresentation = "inline" | "banner" | "modal" | "tts";

export type NarrativeSpoilerLevel = 0 | 1 | 2 | 3;

export type NarrativeInterventionMeta = {
  provider: "static" | "deepseek" | "openai";
  model?: string;
  latencyMs?: number;
  cached?: boolean;
  fallback?: boolean;
  trigger?: string;
};

export type NarrativeClueRef = {
  puzzleId: string;
  hintLevel?: number;
};

export type NarrativeIntervention = {
  id: string;
  sessionId: string;
  teamId?: string;
  sourceEventId: string;
  kind: NarrativeChannel;
  text: string;
  characterId?: string;
  spoilerLevel: NarrativeSpoilerLevel;
  clueRefs?: NarrativeClueRef[];
  presentation: NarrativePresentation;
  createdAt: number;
  sequence: number;
  meta: NarrativeInterventionMeta;
};

/** Contexto enviado al LLM — solo campos autorizados (sin soluciones). */
export type GmViewContext = {
  sessionId: string;
  teamId?: string;
  teamName?: string;
  adventureTitle: string;
  adventureType?: AdventureType;
  authorizedSynopsis?: string;
  authorizedTone?: string;
  currentSceneId: string;
  currentSceneLabel: string;
  currentRoomLabel?: string;
  visitedRoomLabels: string[];
  resolvedPuzzleLabels: string[];
  activePuzzleLabels: string[];
  authorizedInventoryLabels: string[];
  elapsedTimeSec: number;
  remainingTimeSec: number;
  recentAuthorizedEvents: string[];
  recentInterventions: string[];
  authorizedNarrativeFacts: string[];
  /** Solo en flujo HINT_GRANTED: texto YAML autorizado a parafrasear. */
  authorizedHintLine?: string;
  authorizedHintLevel?: number;
  /** Flujo CHARACTER_TURN */
  activeCharacterId?: string;
  activeCharacterDisplayName?: string;
  activeCharacterTone?: string;
  activeCharacterKnowledge?: string[];
  activeCharacterForbiddenTopics?: string[];
  playerUtterance?: string;
  /** GM-5: ritmo inferido (sin secretos). */
  pacingMode?: GmPacingMode;
  progressRatio?: number;
  tempoDirective?: string;
};

export type GmPacingMode = "ahead" | "steady" | "behind" | "critical";

export type GmTriggerType =
  | "SESSION_STARTED"
  | "SCENE_ENTERED"
  | "PUZZLE_SOLVED"
  | "PUZZLE_FAILED"
  | "ITEM_TAKEN"
  | "PASSAGE_UNLOCKED"
  | "GAME_WON"
  | "GAME_LOST"
  | "TIME_WARNING"
  | "TEAM_STUCK"
  | "HINT_GRANTED"
  | "CHARACTER_TURN"
  | "PACE_NUDGE";

export type GmProcessTrigger = {
  type: GmTriggerType;
  sourceEventId: string;
  payload?: Record<string, string | number | undefined>;
};
