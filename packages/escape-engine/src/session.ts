import { randomUUID } from "node:crypto";
import type {
  AiContext,
  ApplyResult,
  GameAction,
  GameEvent,
  InteractionStep,
  PublicState,
  VoiceMatchMode,
} from "@escapeai/shared";
import { matchPlayerAnswer } from "@escapeai/shared";
import type { PlayerContext } from "./player-context.js";
import type { Condition, RoomDefinition, RoomPuzzle } from "./room-definition.js";

export type SessionRecord = {
  sessionId: string;
  room: RoomDefinition;
  playerContext?: PlayerContext;
  currentSceneId: string;
  solvedPuzzles: Set<string>;
  inventory: Set<string>;
  sceneItems: Map<string, Set<string>>;
  puzzleAttempts: Map<string, number>;
  puzzleHintsUsed: Map<string, number>;
  /** Pasos de interacción completados por puzzle (sound, voice, …). */
  puzzleInteractions: Map<string, Set<InteractionStep>>;
  narrative: string[];
  startedAtMs: number;
  status: "playing" | "won" | "lost";
};

export function createSession(room: RoomDefinition, playerContext?: PlayerContext): SessionRecord {
  const sceneItems = new Map<string, Set<string>>();
  for (const scene of Object.values(room.scenes)) {
    sceneItems.set(scene.id, new Set(scene.items ?? []));
  }

  const greeting = playerContext
    ? `${playerContext.displayName}, bienvenido a «${room.name}». Tu misión es personal: las pistas hablan contigo.`
    : `Has entrado en «${room.name}».`;

  const session: SessionRecord = {
    sessionId: randomUUID(),
    room,
    playerContext,
    currentSceneId: room.startSceneId,
    solvedPuzzles: new Set(),
    inventory: new Set(),
    sceneItems,
    puzzleAttempts: new Map(),
    puzzleHintsUsed: new Map(),
    puzzleInteractions: new Map(),
    narrative: [greeting],
    startedAtMs: Date.now(),
    status: "playing",
  };

  const start = room.scenes[room.startSceneId];
  session.narrative.push(start.description.trim());
  return session;
}

export function applyAction(
  session: SessionRecord,
  action: GameAction,
  nowMs = Date.now(),
): ApplyResult {
  if (session.status !== "playing") {
    return {
      ok: false,
      error: "La partida ya ha terminado.",
      state: toPublicState(session, nowMs),
      events: [],
    };
  }

  if (isTimeUp(session, nowMs)) {
    session.status = "lost";
    session.narrative.push("Se acabó el tiempo.");
    return {
      ok: false,
      error: "Tiempo agotado.",
      state: toPublicState(session, nowMs),
      events: [{ type: "game_lost" }],
    };
  }

  const events: GameEvent[] = [];

  switch (action.type) {
    case "submit_answer": {
      const result = submitAnswer(session, action.puzzleId, action.value);
      if (result.event) events.push(result.event);
      if (result.solvedEvent) events.push(result.solvedEvent);
      if (result.error) {
        return {
          ok: false,
          error: result.error,
          state: toPublicState(session, nowMs),
          events,
        };
      }
      break;
    }
    case "use_item": {
      const result = useItem(session, action.itemId, action.puzzleId);
      if (result.event) events.push(result.event);
      if (result.solvedEvent) events.push(result.solvedEvent);
      if (result.error) {
        return {
          ok: false,
          error: result.error,
          state: toPublicState(session, nowMs),
          events,
        };
      }
      break;
    }
    case "take_item": {
      const error = takeItem(session, action.itemId);
      if (error) {
        return { ok: false, error, state: toPublicState(session, nowMs), events };
      }
      const itemName = session.room.items?.[action.itemId]?.name ?? action.itemId;
      session.narrative.push(`Has cogido: ${itemName}.`);
      break;
    }
    case "move": {
      const error = moveToScene(session, action.sceneId);
      if (error) {
        return { ok: false, error, state: toPublicState(session, nowMs), events };
      }
      events.push({ type: "scene_entered", sceneId: action.sceneId });
      break;
    }
    case "request_hint": {
      const hint = requestHint(session, action.puzzleId);
      if (hint.error) {
        return { ok: false, error: hint.error, state: toPublicState(session, nowMs), events };
      }
      session.narrative.push(hint.text!);
      events.push({
        type: "hint_requested",
        puzzleId: action.puzzleId,
        level: hint.level!,
      });
      break;
    }
    case "complete_interaction": {
      const err = completeInteraction(session, action.puzzleId, action.step);
      if (err) {
        return { ok: false, error: err, state: toPublicState(session, nowMs), events };
      }
      break;
    }
  }

  if (checkWin(session)) {
    events.push({ type: "game_won" });
  }

  return { ok: true, state: toPublicState(session, nowMs), events };
}

function submitAnswer(
  session: SessionRecord,
  puzzleId: string,
  rawValue: string,
): {
  error?: string;
  event?: GameEvent;
  solvedEvent?: GameEvent;
} {
  const puzzle = session.room.puzzles[puzzleId];
  if (!puzzle) return { error: "Puzzle desconocido." };
  if (!isAnswerablePuzzle(puzzle.type)) {
    return { error: "Este puzzle no admite respuesta escrita." };
  }
  if (!isPuzzleActive(session, puzzleId)) return { error: "Ese puzzle no está disponible aquí." };
  if (session.solvedPuzzles.has(puzzleId)) return { error: "Puzzle ya resuelto." };

  const stepErr = requireInteractionSteps(session, puzzle);
  if (stepErr) return { error: stepErr };

  const attempts = (session.puzzleAttempts.get(puzzleId) ?? 0) + 1;
  session.puzzleAttempts.set(puzzleId, attempts);

  const voiceMode: VoiceMatchMode =
    puzzle.voiceMatchMode ?? (puzzle.type === "voice" ? "fuzzy" : "exact");

  if (
    !matchPlayerAnswer(rawValue, puzzle.answer ?? "", {
      normalize: puzzle.normalize,
      voiceMatchMode: voiceMode,
      synonyms: puzzle.cameraSynonyms,
    })
  ) {
    session.narrative.push("Respuesta incorrecta.");
    return { event: { type: "puzzle_failed", puzzleId, attempts } };
  }

  session.solvedPuzzles.add(puzzleId);
  session.narrative.push(`¡Puzzle resuelto! (${puzzle.prompt})`);
  return { solvedEvent: { type: "puzzle_solved", puzzleId } };
}

function useItem(
  session: SessionRecord,
  itemId: string,
  puzzleId?: string,
): {
  error?: string;
  event?: GameEvent;
  solvedEvent?: GameEvent;
} {
  if (!session.inventory.has(itemId)) {
    return { error: "No tienes ese objeto." };
  }

  if (!puzzleId) {
    session.narrative.push(`No sabes usar ${itemId} aquí.`);
    return { error: "Indica el puzzle en el que quieres usar el objeto." };
  }

  const puzzle = session.room.puzzles[puzzleId];
  if (!puzzle || puzzle.type !== "inventory") {
    return { error: "Ese objeto no encaja en este puzzle." };
  }
  if (!isPuzzleActive(session, puzzleId)) {
    return { error: "Ese puzzle no está disponible aquí." };
  }
  if (session.solvedPuzzles.has(puzzleId)) {
    return { error: "Puzzle ya resuelto." };
  }
  if (puzzle.requiresItem !== itemId) {
    return { error: "Ese objeto no es el correcto." };
  }

  session.inventory.delete(itemId);
  session.solvedPuzzles.add(puzzleId);
  session.narrative.push(`Has usado ${itemId} correctamente.`);
  return { solvedEvent: { type: "puzzle_solved", puzzleId } };
}

function takeItem(session: SessionRecord, itemId: string): string | undefined {
  const inScene = session.sceneItems.get(session.currentSceneId);
  if (!inScene?.has(itemId)) {
    return "No hay ese objeto en esta escena.";
  }
  inScene.delete(itemId);
  session.inventory.add(itemId);
  return undefined;
}

function moveToScene(session: SessionRecord, sceneId: string): string | undefined {
  const exit = getAvailableExits(session).find((e) => e.toSceneId === sceneId);
  if (!exit) return "No puedes ir ahí todavía.";
  session.currentSceneId = sceneId;
  const scene = session.room.scenes[sceneId];
  session.narrative.push(`— ${scene.title} —`);
  session.narrative.push(scene.description.trim());
  return undefined;
}

function requestHint(
  session: SessionRecord,
  puzzleId: string,
): { error?: string; text?: string; level?: number } {
  const puzzle = session.room.puzzles[puzzleId];
  if (!puzzle) return { error: "Puzzle desconocido." };
  if (!isPuzzleActive(session, puzzleId)) return { error: "Ese puzzle no está disponible." };
  if (session.solvedPuzzles.has(puzzleId)) return { error: "Puzzle ya resuelto." };

  const hints = puzzle.hints ?? [];
  const used = session.puzzleHintsUsed.get(puzzleId) ?? 0;
  if (used >= hints.length) return { error: "No quedan pistas." };
  const max = puzzle.maxHints ?? hints.length;
  if (used >= max) return { error: "Límite de pistas alcanzado." };

  const next = hints[used];
  session.puzzleHintsUsed.set(puzzleId, used + 1);
  return { text: `Pista: ${next.text}`, level: next.level };
}

function checkWin(session: SessionRecord): boolean {
  if (session.status !== "playing") return false;
  if (conditionMet(session, session.room.winCondition)) {
    session.status = "won";
    session.narrative.push("¡Has escapado! Victoria.");
    return true;
  }
  return false;
}

function conditionMet(session: SessionRecord, condition: Condition): boolean {
  switch (condition.type) {
    case "puzzle_solved":
      return session.solvedPuzzles.has(condition.puzzleId);
    case "has_item":
      return session.inventory.has(condition.itemId);
    default:
      return false;
  }
}

function isPuzzleActive(session: SessionRecord, puzzleId: string): boolean {
  const scene = session.room.scenes[session.currentSceneId];
  return (scene.puzzles ?? []).includes(puzzleId);
}

function isAnswerablePuzzle(type: RoomPuzzle["type"]): boolean {
  return ["code", "sound", "voice", "camera", "visual"].includes(type);
}

function requiredSteps(puzzle: RoomPuzzle): InteractionStep[] {
  switch (puzzle.type) {
    case "sound":
      return ["listen"];
    case "voice":
      return ["speak"];
    case "camera":
      return ["capture"];
    case "visual":
      return ["view"];
    default:
      return [];
  }
}

function getInteractionSet(session: SessionRecord, puzzleId: string): Set<InteractionStep> {
  let set = session.puzzleInteractions.get(puzzleId);
  if (!set) {
    set = new Set();
    session.puzzleInteractions.set(puzzleId, set);
  }
  return set;
}

function completeInteraction(
  session: SessionRecord,
  puzzleId: string,
  step: InteractionStep,
): string | undefined {
  const puzzle = session.room.puzzles[puzzleId];
  if (!puzzle) return "Puzzle desconocido.";
  if (!isPuzzleActive(session, puzzleId)) return "Ese puzzle no está disponible aquí.";
  const needed = requiredSteps(puzzle);
  if (!needed.includes(step)) return "Paso no aplicable a este puzzle.";
  getInteractionSet(session, puzzleId).add(step);
  const labels: Record<InteractionStep, string> = {
    listen: "Has escuchado la pista sonora.",
    speak: "El sistema ha captado tu voz.",
    capture: "Foto registrada. Ahora introduce la palabra clave.",
    view: "Has estudiado la imagen.",
  };
  session.narrative.push(labels[step]);
  return undefined;
}

function requireInteractionSteps(session: SessionRecord, puzzle: RoomPuzzle): string | undefined {
  const needed = requiredSteps(puzzle);
  if (needed.length === 0) return undefined;
  const done = getInteractionSet(session, puzzle.id);
  for (const step of needed) {
    if (!done.has(step)) {
      switch (step) {
        case "listen":
          return "Escucha el audio hasta el final antes de responder.";
        case "speak":
          return "Usa el micrófono y di la frase antes de validar.";
        case "capture":
          return "Haz una foto del objeto antes de enviar la respuesta.";
        case "view":
          return "Abre y mira la imagen antes de responder.";
      }
    }
  }
  return undefined;
}

function getAvailableExits(session: SessionRecord) {
  const scene = session.room.scenes[session.currentSceneId];
  return (scene.exits ?? []).map((exit) => ({
    toSceneId: exit.toSceneId,
    label: exit.label,
    available: conditionMet(session, exit.when),
  }));
}

function isTimeUp(session: SessionRecord, nowMs: number): boolean {
  const elapsed = Math.floor((nowMs - session.startedAtMs) / 1000);
  return elapsed >= session.room.timeLimitSec;
}

export function toPublicState(session: SessionRecord, nowMs = Date.now()): PublicState {
  const scene = session.room.scenes[session.currentSceneId];
  const elapsedSec = Math.floor((nowMs - session.startedAtMs) / 1000);
  const timeRemainingSec = Math.max(0, session.room.timeLimitSec - elapsedSec);

  if (session.status === "playing" && timeRemainingSec === 0) {
    session.status = "lost";
    session.narrative.push("Se acabó el tiempo.");
  }

  const sceneItemIds = session.sceneItems.get(session.currentSceneId) ?? new Set();
  const items = session.room.items ?? {};

  function toPublicItem(id: string) {
    const meta = items[id];
    return {
      id,
      name: meta?.name ?? id,
      description: meta?.description,
    };
  }

  const sceneOrder = Object.keys(session.room.scenes);

  return {
    sessionId: session.sessionId,
    roomId: session.room.id,
    roomName: session.room.name,
    playerDisplayName: session.playerContext?.displayName,
    eventJoinCode: session.playerContext?.joinCode,
    status: session.status,
    currentSceneId: session.currentSceneId,
    sceneTitle: scene.title,
    sceneDescription: scene.description.trim(),
    sceneImageUrl: scene.image,
    sceneMood: scene.mood,
    sceneOrder,
    roomTheme: session.room.theme,
    narrative: [...session.narrative],
    puzzles: (scene.puzzles ?? []).map((id) => {
      const puzzle = session.room.puzzles[id];
      const steps = session.puzzleInteractions.get(id);
      return {
        id,
        label: puzzle.label ?? humanizeId(id),
        prompt: puzzle.prompt,
        puzzleType: puzzle.type,
        solved: session.solvedPuzzles.has(id),
        attempts: session.puzzleAttempts.get(id) ?? 0,
        hintsUsed: session.puzzleHintsUsed.get(id) ?? 0,
        maxHints: puzzle.maxHints ?? (puzzle.hints?.length ?? 0),
        completedSteps: steps ? [...steps] : [],
        audioUrl: puzzle.audioUrl,
        soundMode: puzzle.soundMode,
        beepPattern: puzzle.beepPattern,
        minListenSec: puzzle.minListenSec,
        visualUrl: puzzle.visualUrl,
        pexelsQuery: puzzle.pexelsQuery,
        pexelsQueryB: puzzle.pexelsQueryB,
        visualLayout: puzzle.visualLayout,
        falPrompt: puzzle.falPrompt,
        cameraPrompt: puzzle.cameraPrompt,
        cameraMode: puzzle.cameraMode,
        cameraSynonyms: puzzle.cameraSynonyms,
        voiceLocale: puzzle.voiceLocale,
        voiceMatchMode: puzzle.voiceMatchMode,
        allowTextFallback: puzzle.allowTextFallback,
        interactionHints: puzzle.interactionHints,
      };
    }),
    exits: getAvailableExits(session),
    inventory: [...session.inventory],
    sceneItems: [...sceneItemIds],
    inventoryItems: [...session.inventory].map(toPublicItem),
    sceneItemItems: [...sceneItemIds].map(toPublicItem),
    elapsedSec,
    timeLimitSec: session.room.timeLimitSec,
    timeRemainingSec,
  };
}

export function toAiContext(session: SessionRecord, nowMs = Date.now()): AiContext {
  const publicState = toPublicState(session, nowMs);
  const scene = session.room.scenes[session.currentSceneId];

  const ctx = session.playerContext;

  return {
    sessionId: session.sessionId,
    roomName: session.room.name,
    playerDisplayName: ctx?.displayName,
    eventTitle: ctx?.eventTitle ?? session.room.name,
    adventureType: ctx?.adventureType,
    sceneTitle: scene.title,
    sceneDescription: scene.description.trim(),
    status: publicState.status,
    puzzles: publicState.puzzles.map((p) => ({
      id: p.id,
      prompt: p.prompt,
      solved: p.solved,
      attempts: p.attempts,
      hintsUsed: p.hintsUsed,
    })),
    inventory: [...session.inventory],
    timeRemainingSec: publicState.timeRemainingSec,
    recentNarrative: session.narrative.slice(-8),
  };
}

function humanizeId(id: string): string {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
