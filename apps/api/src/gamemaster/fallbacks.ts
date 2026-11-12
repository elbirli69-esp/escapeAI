import type { SessionRecord } from "@escapeai/escape-engine";
import type { GmProcessTrigger, NarrativeInterventionMeta } from "@escapeai/shared";
import { getRoomCharacter, pickCharacterFallback } from "./characters.js";

const STATIC_META: NarrativeInterventionMeta = { provider: "static", fallback: true };

export function staticInterventionText(
  session: SessionRecord,
  trigger: GmProcessTrigger,
): {
  text: string;
  kind: "narration" | "notification" | "hint" | "character";
  meta: NarrativeInterventionMeta;
} {
  const team = session.playerContext?.displayName;
  const name = session.room.name;
  const type = trigger.type;

  switch (type) {
    case "SESSION_STARTED":
      return {
        text: team
          ? `${team}, el misterio «${name}» os espera. Probad el primer reto cuando estéis listos.`
          : `El misterio «${name}» comienza. Explora con calma cada escena.`,
        kind: "narration",
        meta: STATIC_META,
      };
    case "SCENE_ENTERED": {
      const sceneId = String(trigger.payload?.sceneId ?? "");
      const scene = session.room.scenes[sceneId];
      const title = scene?.title ?? "nueva zona";
      return {
        text: `Entráis en ${title}. El ambiente sugiere que algo aguarda atención aquí.`,
        kind: "narration",
        meta: STATIC_META,
      };
    }
    case "PUZZLE_SOLVED": {
      const puzzleId = String(trigger.payload?.puzzleId ?? "");
      const puzzle = session.room.puzzles[puzzleId];
      const label = puzzle?.label ?? puzzleId;
      return {
        text: team
          ? `${team} habéis descifrado «${label}». El hilo se tensa, seguid.`
          : `Avance logrado en «${label}». El camino continúa.`,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "ITEM_TAKEN": {
      const itemId = String(trigger.payload?.itemId ?? "");
      const itemName = session.room.items?.[itemId]?.name ?? itemId;
      return {
        text: `Habéis recogido «${itemName}». Quizá encaje en algún mecanismo.`,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "PASSAGE_UNLOCKED": {
      const label = String(trigger.payload?.label ?? "la salida");
      return {
        text: `Un pasaje se abre hacia ${label}. Decidid cuándo cruzarlo.`,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "GAME_WON":
      return {
        text: team
          ? `¡Victoria, ${team}! «${name}» cede ante vuestra deducción. Repasad el diario: lo vivido es real.`
          : `¡Victoria! El misterio queda resuelto.`,
        kind: "narration",
        meta: STATIC_META,
      };
    case "GAME_LOST":
      return {
        text: `El tiempo se agotó sobre «${name}». El enigma queda para otro intento.`,
        kind: "narration",
        meta: STATIC_META,
      };
    case "TIME_WARNING": {
      const label = String(trigger.payload?.label ?? "el tiempo");
      return {
        text: `Recordad: queda ${label}. Priorizad lo que aún no resolvisteis.`,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "TEAM_STUCK": {
      const label =
        session.room.puzzles[String(trigger.payload?.puzzleId ?? "")]?.label ?? "este reto";
      return {
        text: `Lleváis un rato en «${label}». Si necesitáis ayuda, usad «Pedir pista» — el conserje no revelará más de lo autorizado.`,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "CHARACTER_TURN": {
      const characterId = String(trigger.payload?.characterId ?? "");
      const profile = getRoomCharacter(session, characterId);
      if (!profile) {
        return {
          text: "Nadie responde.",
          kind: "character",
          meta: STATIC_META,
        };
      }
      const line = pickCharacterFallback(profile);
      return {
        text: `${profile.displayName}: ${line}`,
        kind: "character",
        meta: STATIC_META,
      };
    }
    case "HINT_GRANTED": {
      const puzzleId = String(trigger.payload?.puzzleId ?? "");
      const level = Number(trigger.payload?.level ?? 1);
      const puzzle = session.room.puzzles[puzzleId];
      const curated = puzzle?.hints?.[level - 1]?.text;
      if (curated) {
        return {
          text: `El director acentúa: ${curated}`,
          kind: "hint",
          meta: STATIC_META,
        };
      }
      return {
        text: "Recibid esta pista con calma; el puzzle sigue en vuestras manos.",
        kind: "hint",
        meta: STATIC_META,
      };
    }
    default:
      return {
        text: "Continuad: las piezas del misterio siguen ahí fuera.",
        kind: "narration",
        meta: STATIC_META,
      };
  }
}
