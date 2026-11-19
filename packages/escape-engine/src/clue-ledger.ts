import type { ClueLedgerEntry } from "@escapeai/shared";
import type { SessionRecord } from "./session.js";

/** Historial jugable: pistas YAML consumidas + clues de beats (fuente única: sesión). */
export function buildClueHistory(session: SessionRecord): ClueLedgerEntry[] {
  const entries: ClueLedgerEntry[] = [];

  for (const [puzzleId, used] of session.puzzleHintsUsed.entries()) {
    if (used <= 0) continue;
    const hints = session.room.puzzles[puzzleId]?.hints ?? [];
    for (let i = 0; i < Math.min(used, hints.length); i++) {
      const hint = hints[i]!;
      entries.push({
        id: `hint:${puzzleId}:${hint.level}`,
        kind: "hint",
        puzzleId,
        hintLevel: hint.level,
        text: hint.text,
      });
    }
  }

  for (const [id, text] of session.grantedClues.entries()) {
    entries.push({
      id,
      kind: "beat_clue",
      text,
    });
  }

  return entries;
}