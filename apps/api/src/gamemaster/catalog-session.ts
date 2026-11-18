import type { SessionRecord } from "@escapeai/escape-engine";
import type { GmPacingMode } from "@escapeai/shared";
import type { GmSessionMeta } from "./persistence.js";
import type { GmProcessTrigger } from "@escapeai/shared";

const CATALOG_FAIL_NUDGE_MIN_ATTEMPTS = 2;
const CATALOG_ROOM_IDS = new Set(["pilot", "lighthouse"]);

/** Partida en sala de catálogo (pilot / lighthouse), sin código de evento. */
export function isCatalogSession(session: SessionRecord): boolean {
  if (session.playerContext?.joinCode) return false;
  return CATALOG_ROOM_IDS.has(session.room.id);
}

export function isCatalogFailNudgeEligible(
  session: SessionRecord,
  trigger: GmProcessTrigger,
  meta: GmSessionMeta,
): boolean {
  if (!isCatalogSession(session) || trigger.type !== "PUZZLE_FAILED") return false;
  const puzzleId = String(trigger.payload?.puzzleId ?? "");
  if (!puzzleId || meta.catalogFailNudgePuzzleIds.includes(puzzleId)) return false;
  const attempts = Number(trigger.payload?.attempts ?? 0);
  return attempts >= CATALOG_FAIL_NUDGE_MIN_ATTEMPTS;
}

export function markCatalogFailNudged(meta: GmSessionMeta, puzzleId: string): GmSessionMeta {
  if (meta.catalogFailNudgePuzzleIds.includes(puzzleId)) return meta;
  return {
    ...meta,
    catalogFailNudgePuzzleIds: [...meta.catalogFailNudgePuzzleIds, puzzleId],
  };
}

export function catalogPaceNudgeCopy(mode: GmPacingMode, roomId: string): string {
  if (mode === "critical") {
    return roomId === "lighthouse"
      ? "La tormenta no espera: cerrad el faro antes de perder la ventana de marea."
      : "El edificio apaga luces poco a poco: priorizad el mecanismo que aún bloquea la salida.";
  }
  return roomId === "lighthouse"
    ? "El farero nota que el reloj avanza más que las resoluciones. Atacad la prueba sonora o el candado abierto."
    : "El conserje percibe parón: un puzzle resuelto ahora vale más que recorrer pasillos sin hilo.";
}

export function catalogTeamStuckCopy(
  roomId: string,
  puzzleLabel: string,
  assistTier: "standard" | "ambient",
): string {
  if (assistTier === "ambient") {
    return roomId === "lighthouse"
      ? `La niebla rodea «${puzzleLabel}». Releed el cuaderno y pedid pista: el farero solo suelta lo autorizado.`
      : `El silencio del portal pesa sobre «${puzzleLabel}». Pedid pista con calma — el conserje no rompe las reglas.`;
  }
  return roomId === "lighthouse"
    ? `«${puzzleLabel}» frena el ascenso al faro. Si os trabáis, «Pedir pista» — el director acaba de autorizar una extra.`
    : `Lleváis un rato en «${puzzleLabel}». «Pedir pista»: el conserje acaba de autorizar una ayuda más en esta partida.`;
}

export function catalogPuzzleFailedCopy(
  roomId: string,
  puzzleId: string,
  puzzleLabel: string,
): string | undefined {
  if (roomId === "pilot") {
    if (puzzleId === "lockbox") {
      return "El conserje carraspea: el portal suena antes que el candado — quizá la primera cifra no está en el post-it.";
    }
    if (puzzleId === "intercom_tone") {
      return "El pitido no encaja. Escuchad de nuevo sin prisa: un solo tono suele ser una sola cifra.";
    }
    if (puzzleId === "panel_final") {
      return "El panel zumba. Cuando el fusible vuelve, lo primero que el edificio agradece suele tener cuatro letras.";
    }
  }
  if (roomId === "lighthouse") {
    if (puzzleId === "tide_lock") {
      return "La cerradura de marea resiste. El cuerno en el muelle suele dar el prefijo antes de la combinatoria.";
    }
    if (puzzleId === "fog_horn") {
      return "La secuencia no encaja. Cada pitido del cuerno es un dígito que anotar en orden.";
    }
    if (puzzleId === "beacon_sequence") {
      return "El faro parpadea incompleto. Revisad lo resuelto en el mirador antes de la secuencia final.";
    }
  }
  return `«${puzzleLabel}» no cede todavía. Repasad objetos y lo que lleváis anotado — sin fuerza bruta.`;
}

export function catalogPuzzleSolvedCopy(roomId: string, puzzleId: string, puzzleLabel: string): string | undefined {
  if (roomId === "pilot" && puzzleId === "lockbox") {
    return `El candado cede. El conserje asiente: el año del post-it era la llave — seguid el hilo hacia el sótano.`;
  }
  if (roomId === "lighthouse" && puzzleId === "tide_lock") {
    return `La marea encaja en la cerradura. El faro recupera un latido — subid hacia el almacén con ese ritmo.`;
  }
  if (roomId === "lighthouse" && puzzleId === "fog_horn") {
    return `El cuerno marca el compás. Anotad la secuencia: el faro usa ese mismo pulso más arriba.`;
  }
  return `«${puzzleLabel}» resuelto. El edificio responde — pasad al siguiente hilo sin perder lo anotado.`;
}