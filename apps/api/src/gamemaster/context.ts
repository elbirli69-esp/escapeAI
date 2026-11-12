import type { SessionRecord } from "@escapeai/escape-engine";
import { toPublicState } from "@escapeai/escape-engine";
import type { GmViewContext, NarrativeIntervention } from "@escapeai/shared";

function humanizeId(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function itemLabel(session: SessionRecord, itemId: string): string {
  return session.room.items?.[itemId]?.name ?? humanizeId(itemId);
}

function puzzleLabel(session: SessionRecord, puzzleId: string): string {
  const p = session.room.puzzles[puzzleId];
  return p?.label ?? humanizeId(puzzleId);
}

/** Construye contexto autorizado para el LLM — solo campos permitidos explícitamente. */
export function buildGmViewContext(
  session: SessionRecord,
  recentInterventions: NarrativeIntervention[],
  visitedSceneIds: string[],
  recentAuthorizedEvents: string[],
  nowMs = Date.now(),
): GmViewContext {
  const publicState = toPublicState(session, nowMs);
  const scene = session.room.scenes[session.currentSceneId];
  const ctx = session.playerContext;

  const visitedRoomLabels: string[] = [];
  for (const sceneId of visitedSceneIds) {
    const s = session.room.scenes[sceneId];
    if (s?.title) visitedRoomLabels.push(s.title);
  }
  if (publicState.spatialRoomLabel) {
    visitedRoomLabels.push(publicState.spatialRoomLabel);
  }

  const resolvedPuzzleLabels = [...session.solvedPuzzles].map((id) => puzzleLabel(session, id));

  const activePuzzleLabels = (scene.puzzles ?? [])
    .filter((id) => !session.solvedPuzzles.has(id))
    .map((id) => puzzleLabel(session, id));

  const authorizedInventoryLabels = [...session.inventory].map((id) => itemLabel(session, id));

  const authorizedNarrativeFacts: string[] = [];
  if (ctx?.eventTitle) authorizedNarrativeFacts.push(`Evento: ${ctx.eventTitle}`);
  if (session.room.tagline) authorizedNarrativeFacts.push(session.room.tagline);

  return {
    sessionId: session.sessionId,
    teamId: ctx?.playerId,
    teamName: ctx?.displayName,
    adventureTitle: ctx?.eventTitle ?? session.room.name,
    adventureType: ctx?.adventureType,
    authorizedSynopsis: session.room.tagline,
    authorizedTone: session.room.theme,
    currentSceneId: session.currentSceneId,
    currentSceneLabel: scene?.title ?? humanizeId(session.currentSceneId),
    currentRoomLabel: publicState.spatialRoomLabel,
    visitedRoomLabels: [...new Set(visitedRoomLabels)],
    resolvedPuzzleLabels,
    activePuzzleLabels,
    authorizedInventoryLabels,
    elapsedTimeSec: publicState.elapsedSec,
    remainingTimeSec: publicState.timeRemainingSec,
    recentAuthorizedEvents,
    recentInterventions: recentInterventions.slice(-5).map((i) => i.text),
    authorizedNarrativeFacts,
  };
}

/** Secretos del room para validación de salida (nunca van al LLM). */
export function collectForbiddenAnswerTokens(session: SessionRecord): string[] {
  const tokens: string[] = [];
  for (const puzzle of Object.values(session.room.puzzles)) {
    if (puzzle.answer) tokens.push(puzzle.answer);
    if (puzzle.cameraSynonyms?.length) tokens.push(...puzzle.cameraSynonyms);
  }
  return tokens.filter((t) => t.length >= 2);
}

/** Comprueba que el contexto no filtra secretos (tests). */
export function assertGmViewContextSafe(
  context: GmViewContext,
  forbidden: string[],
): string[] {
  const blob = JSON.stringify(context).toLowerCase();
  const leaks: string[] = [];
  for (const token of forbidden) {
    if (token.length >= 3 && blob.includes(token.toLowerCase())) {
      leaks.push(token);
    }
  }
  return leaks;
}
