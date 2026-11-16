import type { SessionRecord } from "@escapeai/escape-engine";
import type { GmPacingMode, GmProcessTrigger, NarrativeInterventionMeta } from "@escapeai/shared";
import { getRoomCharacter, pickCharacterFallback } from "./characters.js";
import {
  clueNotebookHint,
  eventAdventureType,
  eventAheadPuzzleSolvedCopy,
  eventPaceNudgeCopy,
  eventSessionStartedCopy,
  eventTeamStuckCopy,
  eventTimeWarningCopy,
  isEventSession,
} from "./event-session.js";
import { computeGmPacing } from "./pacing.js";

const STATIC_META: NarrativeInterventionMeta = { provider: "static", fallback: true };

export function staticInterventionText(
  session: SessionRecord,
  trigger: GmProcessTrigger,
  options?: { pacingMode?: GmPacingMode; useAheadFlavor?: boolean },
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
        text: isEventSession(session)
          ? eventSessionStartedCopy(session)
          : team
            ? `${team}, el misterio «${name}» os espera. Probad el primer reto cuando estéis listos.`
            : `El misterio «${name}» comienza. Explora con calma cada escena.`,
        kind: "narration",
        meta: STATIC_META,
      };
    case "SCENE_ENTERED": {
      const sceneId = String(trigger.payload?.sceneId ?? "");
      const scene = session.room.scenes[sceneId];
      const title = scene?.title ?? "nueva zona";
      const siteMap = session.room.spatialSiteMap;
      const spatialRoom = siteMap?.rooms.find((r) => r.sceneId === sceneId);
      if (spatialRoom && siteMap) {
        const visit = siteMap.suggestedVisit.find((v) => v.sceneId === sceneId);
        const kind =
          visit?.kind === "outdoor" ? "exterior real" : visit ? "interior del recinto" : "estancia";
        return {
          text: `Estáis en «${spatialRoom.label}» (${kind}) dentro de ${siteMap.siteName}. Explorad con calma antes de forzar cerraduras.`,
          kind: "narration",
          meta: STATIC_META,
        };
      }
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
      const pacing = options?.pacingMode ?? computeGmPacing(session).mode;
      let text: string;
      if (
        isEventSession(session) &&
        options?.useAheadFlavor &&
        pacing === "ahead"
      ) {
        text =
          eventAheadPuzzleSolvedCopy(label, eventAdventureType(session)) ??
          (team
            ? `${team} habéis descifrado «${label}». El hilo se tensa, seguid.`
            : `Avance logrado en «${label}». El camino continúa.`);
      } else if (isEventSession(session)) {
        text = team
          ? `${team} habéis cerrado «${label}». Actualizad el cuaderno y seguid el hilo.`
          : `Avance en «${label}». El cuaderno de pistas es vuestra brújula.`;
      } else {
        text = team
          ? `${team} habéis descifrado «${label}». El hilo se tensa, seguid.`
          : `Avance logrado en «${label}». El camino continúa.`;
      }
      return {
        text,
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
    case "GAME_WON": {
      const ctx = session.playerContext;
      const eventLabel = ctx?.eventTitle ?? name;
      const tag = session.room.tagline?.trim();
      const teamPrefix = team ? `${team} — ` : "";
      let payoff: string;
      switch (ctx?.adventureType) {
        case "birthday":
          payoff = `El homenaje a «${eventLabel}» tiene cierre en esta sala.`;
          break;
        case "celebration":
          payoff = `La celebración «${eventLabel}» puede brindar: misión completada.`;
          break;
        case "mystery":
          payoff = `El informe sobre «${eventLabel}» puede archivarse. Conectaste datos, pruebas y salida.`;
          break;
        case "team":
          payoff = `Reto «${eventLabel}» registrado. Comparad tiempos en el ranking del organizador.`;
          break;
        default:
          payoff = team
            ? `«${eventLabel}» queda resuelto para vuestro equipo.`
            : `«${eventLabel}» queda resuelto.`;
      }
      const tagSuffix = tag ? ` ${tag}` : "";
      return {
        text: `¡Victoria! ${teamPrefix}${payoff}${tagSuffix}`,
        kind: "narration",
        meta: STATIC_META,
      };
    }
    case "GAME_LOST":
      return {
        text: `El tiempo se agotó sobre «${name}». El enigma queda para otro intento.`,
        kind: "narration",
        meta: STATIC_META,
      };
    case "TIME_WARNING": {
      const label = String(trigger.payload?.label ?? "el tiempo");
      const text = isEventSession(session)
        ? eventTimeWarningCopy(label, eventAdventureType(session))
        : `Recordad: queda ${label}. Priorizad lo que aún no resolvisteis.`;
      return {
        text,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "PACE_NUDGE": {
      const mode = (String(trigger.payload?.pacingMode ?? "behind") === "critical"
        ? "critical"
        : "behind") as GmPacingMode;
      const text = isEventSession(session)
        ? eventPaceNudgeCopy(mode, eventAdventureType(session))
        : mode === "critical"
          ? "El reloj apremia: concentrad energía en el reto que tenéis delante antes de explorar más."
          : "El director nota que el tiempo corre más rápido que los avances. Priorizad un puzzle abierto.";
      return {
        text,
        kind: "notification",
        meta: STATIC_META,
      };
    }
    case "TEAM_STUCK": {
      const puzzleId = String(trigger.payload?.puzzleId ?? "");
      const label = session.room.puzzles[puzzleId]?.label ?? "este reto";
      const assistTier =
        trigger.payload?.assistTier === "ambient" ? ("ambient" as const) : ("standard" as const);
      const text = isEventSession(session)
        ? eventTeamStuckCopy(
            label,
            eventAdventureType(session),
            assistTier,
            clueNotebookHint(session),
          )
        : `Lleváis un rato en «${label}». Si necesitáis ayuda, usad «Pedir pista» — el conserje no revelará más de lo autorizado.`;
      return {
        text,
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
