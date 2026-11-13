import type { InteractionStep } from "@escapeai/shared";
import type { PlayerContext } from "./player-context.js";
import type { RoomDefinition } from "./room-definition.js";
import type { SessionRecord } from "./session.js";

export type SerializedSession = {
  sessionId: string;
  room: RoomDefinition;
  playerContext?: PlayerContext;
  currentSceneId: string;
  solvedPuzzles: string[];
  inventory: string[];
  sceneItems: Record<string, string[]>;
  puzzleAttempts: Record<string, number>;
  puzzleHintsUsed: Record<string, number>;
  puzzleInteractions: Record<string, InteractionStep[]>;
  narrative: string[];
  startedAtMs: number;
  status: SessionRecord["status"];
  grantedClues: Record<string, string>;
  firedBeats: string[];
};

export function serializeSession(session: SessionRecord): SerializedSession {
  const sceneItems: Record<string, string[]> = {};
  for (const [sceneId, items] of session.sceneItems) {
    sceneItems[sceneId] = [...items];
  }

  return {
    sessionId: session.sessionId,
    room: session.room,
    playerContext: session.playerContext,
    currentSceneId: session.currentSceneId,
    solvedPuzzles: [...session.solvedPuzzles],
    inventory: [...session.inventory],
    sceneItems,
    puzzleAttempts: Object.fromEntries(session.puzzleAttempts),
    puzzleHintsUsed: Object.fromEntries(session.puzzleHintsUsed),
    puzzleInteractions: Object.fromEntries(
      [...session.puzzleInteractions].map(([k, v]) => [k, [...v]]),
    ),
    narrative: [...session.narrative],
    startedAtMs: session.startedAtMs,
    status: session.status,
    grantedClues: Object.fromEntries(session.grantedClues),
    firedBeats: [...session.firedBeats],
  };
}

export function deserializeSession(data: SerializedSession): SessionRecord {
  const sceneItems = new Map<string, Set<string>>();
  for (const [sceneId, items] of Object.entries(data.sceneItems)) {
    sceneItems.set(sceneId, new Set(items));
  }

  return {
    sessionId: data.sessionId,
    room: data.room,
    playerContext: data.playerContext,
    currentSceneId: data.currentSceneId,
    solvedPuzzles: new Set(data.solvedPuzzles),
    inventory: new Set(data.inventory),
    sceneItems,
    puzzleAttempts: new Map(Object.entries(data.puzzleAttempts)),
    puzzleHintsUsed: new Map(Object.entries(data.puzzleHintsUsed)),
    puzzleInteractions: new Map(
      Object.entries(data.puzzleInteractions ?? {}).map(([k, steps]) => [k, new Set(steps)]),
    ),
    narrative: [...data.narrative],
    startedAtMs: data.startedAtMs,
    status: data.status,
    grantedClues: new Map(Object.entries(data.grantedClues ?? {})),
    firedBeats: new Set(data.firedBeats ?? []),
  };
}
