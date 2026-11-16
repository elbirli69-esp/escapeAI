import type { InteractionStep } from "@escapeai/shared";
import type { SessionRecord } from "./session.js";

const FAIL_FORWARD_ENTRY_ATTEMPTS = 4;
const FAIL_FORWARD_SOUND_ATTEMPTS = 2;

export function isGeneratedEventSession(session: SessionRecord): boolean {
  return Boolean(session.playerContext?.joinCode) && session.room.id.startsWith("generated-");
}

/** Pista YAML adicional autorizada por el director (sin cambiar la respuesta). */
export function grantBonusHintLevel(session: SessionRecord, puzzleId: string, levels = 1): boolean {
  if (!isGeneratedEventSession(session)) return false;
  const next = (session.bonusHintLevels.get(puzzleId) ?? 0) + levels;
  session.bonusHintLevels.set(puzzleId, next);
  return true;
}

export function effectiveHintCap(
  session: SessionRecord,
  puzzleId: string,
  yamlHintCount: number,
  configuredMax?: number,
): number {
  const base = configuredMax ?? yamlHintCount;
  const bonus = session.bonusHintLevels.get(puzzleId) ?? 0;
  return Math.min(yamlHintCount, base + bonus);
}

function interactionSet(session: SessionRecord, puzzleId: string): Set<InteractionStep> {
  let set = session.puzzleInteractions.get(puzzleId);
  if (!set) {
    set = new Set();
    session.puzzleInteractions.set(puzzleId, set);
  }
  return set;
}

/** Acto 1 generado: desbloquea `listen` en sound_intro tras muchos fallos (una vez). */
export function maybeGeneratedFailForward(session: SessionRecord, failedPuzzleId: string): boolean {
  if (!isGeneratedEventSession(session)) return false;
  if (session.currentSceneId !== "start") return false;
  if (session.failForwardSoundIntro) return false;

  const sound = session.room.puzzles.sound_intro;
  if (!sound || sound.type !== "sound") return false;
  if (interactionSet(session, "sound_intro").has("listen")) return false;

  const entryAttempts = session.puzzleAttempts.get("entry_lock") ?? 0;
  const soundAttempts = session.puzzleAttempts.get("sound_intro") ?? 0;
  const triggered =
    (failedPuzzleId === "entry_lock" && entryAttempts >= FAIL_FORWARD_ENTRY_ATTEMPTS) ||
    (failedPuzzleId === "sound_intro" && soundAttempts >= FAIL_FORWARD_SOUND_ATTEMPTS);
  if (!triggered) return false;

  interactionSet(session, "sound_intro").add("listen");
  session.failForwardSoundIntro = true;
  session.narrative.push(
    "📻 El mensaje sonoro se afina solo — el director os deja escucharlo para anotar el prefijo.",
  );
  return true;
}