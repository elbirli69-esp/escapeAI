import type { SessionRecord } from "@escapeai/escape-engine";
import type { GameEvent } from "@escapeai/shared";

/** Texto de pista autorizado en YAML (nunca inventar). */
export function getAuthorizedHintText(session: SessionRecord, puzzleId: string, level: number): string | undefined {
  const puzzle = session.room.puzzles[puzzleId];
  if (!puzzle?.hints?.length) return undefined;
  const idx = level - 1;
  if (idx < 0 || idx >= puzzle.hints.length) return undefined;
  return puzzle.hints[idx]?.text?.trim();
}

export function hintSpoilerLevel(level: number): 0 | 1 | 2 | 3 {
  if (level <= 1) return 1;
  if (level === 2) return 2;
  return 3;
}

/** Orientación ambiental sin revelar solución (interactionHints del puzzle). */
export function getAuthorizedInteractionNudge(session: SessionRecord, puzzleId: string): string | undefined {
  const puzzle = session.room.puzzles[puzzleId];
  const line = puzzle?.interactionHints?.[0];
  return line?.trim();
}

export function primaryOpenPuzzleId(session: SessionRecord): string | undefined {
  const scene = session.room.scenes[session.currentSceneId];
  const ids = scene?.puzzles ?? [];
  for (const id of ids) {
    if (!session.solvedPuzzles.has(id)) return id;
  }
  return undefined;
}

export function isPuzzleActiveInScene(session: SessionRecord, puzzleId: string): boolean {
  const scene = session.room.scenes[session.currentSceneId];
  return (scene?.puzzles ?? []).includes(puzzleId);
}

export function hasProgressEvent(events: GameEvent[]): boolean {
  return events.some((e) =>
    ["puzzle_solved", "scene_entered", "game_won", "game_lost"].includes(e.type),
  );
}
