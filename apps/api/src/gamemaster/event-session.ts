import {
  grantBonusHintLevel,
  isGeneratedEventSession,
  type SessionRecord,
} from "@escapeai/escape-engine";
import type { AdventureType, GmPacingMode } from "@escapeai/shared";
import type { GmSessionMeta } from "./persistence.js";
import { isCatalogSession } from "./catalog-session.js";

/** Partida ligada a evento multiequipo (código de acceso). */
export function isEventSession(session: SessionRecord): boolean {
  return Boolean(session.playerContext?.joinCode);
}

/** Fase B: una pista YAML extra en el puzzle abierto tras nudge/stuck del director. */
export function maybeGrantBonusHintFromGm(
  session: SessionRecord,
  meta: GmSessionMeta,
  puzzleId: string | undefined,
): GmSessionMeta {
  if (!puzzleId || (!isGeneratedEventSession(session) && !isCatalogSession(session))) return meta;
  if (meta.bonusHintGrantedPuzzleIds.includes(puzzleId)) return meta;
  if (!grantBonusHintLevel(session, puzzleId, 1)) return meta;
  return {
    ...meta,
    bonusHintGrantedPuzzleIds: [...meta.bonusHintGrantedPuzzleIds, puzzleId],
  };
}

export function eventAdventureType(session: SessionRecord): AdventureType | undefined {
  return session.playerContext?.adventureType;
}

export function clueNotebookHint(session: SessionRecord): string | undefined {
  const n = session.grantedClues.size;
  if (n === 0) return undefined;
  return "Repasad el cuaderno de pistas: lo que anotasteis al resolver retos sigue valiendo.";
}

/** Copy por ocasión cuando el director interviene en partidas de evento. */
export function eventPaceNudgeCopy(
  mode: GmPacingMode,
  adventure?: AdventureType,
): string {
  if (mode === "critical") {
    switch (adventure) {
      case "team":
        return "Últimos minutos del reto: un solo puzzle abierto y cerráis antes que el resto de equipos.";
      case "mystery":
        return "El informe debe cerrarse ya: priorizad la evidencia que desbloquea la salida.";
      case "birthday":
        return "La sorpresa no espera eternamente: concentrad energía en el candado que tenéis delante.";
      case "celebration":
        return "La fiesta sigue, pero el reloj no: id al reto que aún no habéis roto.";
      default:
        return "El reloj apremia: concentrad energía en el reto que tenéis delante antes de explorar más.";
    }
  }
  switch (adventure) {
    case "team":
      return "Vais por detrás del ritmo ideal. Un reto resuelto ahora vale más que recorrer escenas al azar.";
    case "mystery":
      return "La investigación se enfría: enlazad lo del cuaderno con el candado que tenéis abierto.";
    case "birthday":
      return "El homenaje merece avanzar: priorizad un puzzle abierto antes de distraeros.";
    case "celebration":
      return "La celebración pierde chispa si os quedáis quietos: atacad un reto pendiente.";
    default:
      return "El director nota que el tiempo corre más rápido que los avances. Priorizad un puzzle abierto.";
  }
}

export function eventTeamStuckCopy(
  puzzleLabel: string,
  adventure: AdventureType | undefined,
  assistTier: "standard" | "ambient",
  notebookHint?: string,
): string {
  if (assistTier === "ambient") {
    const ambient =
      adventure === "mystery"
        ? "Un ruido lejano, como un cajón mal cerrado: buscad un detalle que relacionéis con lo del cuaderno, no con la solución completa."
        : adventure === "team"
          ? "El organizador insinúa por megafonía: «menos vueltas, más datos del cuaderno»."
          : "El ambiente os empuja suavemente: mirad otra vez las notas del cuaderno antes de insistir a ciegas.";
    const tail = notebookHint ?? "Revisad el cuaderno antes de pedir otra pista textual.";
    return `${ambient} ${tail}`;
  }

  const base =
    adventure === "mystery"
      ? `Lleváis un rato en «${puzzleLabel}». Contrastad el cuaderno con lo que veis aquí; «Pedir pista» sigue autorizado.`
      : adventure === "team"
        ? `«${puzzleLabel}» frena al equipo. Repasad el cuaderno y usad «Pedir pista» si lo necesitáis.`
        : adventure === "birthday"
          ? `En «${puzzleLabel}» hay tensión bonita: mirad el cuaderno y, si hace falta, pedid pista.`
          : `Lleváis un rato en «${puzzleLabel}». Revisad el cuaderno y «Pedir pista» si queréis un empujón autorizado.`;
  return notebookHint ? `${base} ${notebookHint}` : base;
}

export function eventTimeWarningCopy(
  timeLabel: string,
  adventure?: AdventureType,
): string {
  switch (adventure) {
    case "team":
      return `Queda ${timeLabel}. Cada minuto cuenta en el ranking del organizador.`;
    case "mystery":
      return `Queda ${timeLabel}. Cerrad el hilo del informe con lo que ya anotasteis.`;
    case "birthday":
      return `Queda ${timeLabel}. La sorpresa está cerca si priorizáis un reto abierto.`;
    case "celebration":
      return `Queda ${timeLabel}. La fiesta gana si cerráis antes de que suene la última canción.`;
    default:
      return `Recordad: queda ${timeLabel}. Priorizad lo que aún no resolvisteis.`;
  }
}

export function eventSessionStartedCopy(session: SessionRecord): string {
  const team = session.playerContext?.displayName;
  const title = session.playerContext?.eventTitle ?? session.room.name;
  const adventure = eventAdventureType(session);
  const tag = session.room.tagline?.trim();

  let intro: string;
  switch (adventure) {
    case "birthday":
      intro = team
        ? `${team}, el homenaje «${title}» arranca. Tomad nota de cada pista que ganéis.`
        : `Comienza el homenaje «${title}». Las pistas del cuaderno guían el cierre.`;
      break;
    case "celebration":
      intro = team
        ? `${team}, la celebración «${title}» os espera. Resolved con ritmo sin correr sin pistas.`
        : `La celebración «${title}» comienza. Explorad con calma y anotad lo importante.`;
      break;
    case "mystery":
      intro = team
        ? `${team}, caso «${title}». Cada acierto alimenta el cuaderno de evidencias.`
        : `Investigación «${title}». Documentad cada avance en el cuaderno.`;
      break;
    case "team":
      intro = team
        ? `${team}, competís en «${title}». Velocidad sí, pero sin saltar el hilo de pistas.`
        : `Reto de equipos «${title}». Cooperad y rastread pistas en el cuaderno.`;
      break;
    default:
      intro = team
        ? `${team}, el misterio «${title}» os espera. Probad el primer reto cuando estéis listos.`
        : `El misterio «${title}» comienza. Explora con calma cada escena.`;
  }
  return tag ? `${intro} ${tag}` : intro;
}

export function eventPuzzleFailedCopy(
  puzzleId: string,
  puzzleLabel: string,
  adventure?: AdventureType,
): string {
  if (puzzleId === "sound_intro") {
    return "El mensaje oculto no encaja todavía. Escuchad el audio completo (o pitidos de respaldo) y anotad solo el prefijo de dos cifras.";
  }
  if (puzzleId === "entry_lock") {
    const tone =
      adventure === "mystery"
        ? "El candado rechaza la hipótesis. Cruzad lo del cuaderno con el prefijo del audio."
        : "El candado numérico resiste. Las dos primeras cifras vinieron del mensaje sonoro del mismo acto.";
    return tone;
  }
  if (puzzleId === "camera_hunt") {
    return `«${puzzleLabel}» no valida la foto. Buscad en escena lo que el organizador nombró, no texto aleatorio.`;
  }
  if (puzzleId === "token_slot" || puzzleId === "visual_gallery") {
    return "El recuerdo físico aún no encaja. Revisad lo resuelto en la escena anterior y el cuaderno.";
  }
  if (puzzleId === "final_code" || puzzleId === "voice_seal") {
    return adventure === "team"
      ? "El cierre del reto pide orden: cuaderno primero, cifra final después — sin atajos."
      : "El cierre exige paciencia: enlazad las pistas del cuaderno antes de otro intento a ciegas.";
  }
  return `«${puzzleLabel}» resiste. Repasad el cuaderno y escenas previas antes de insistir.`;
}

export function eventAheadPuzzleSolvedCopy(
  puzzleLabel: string,
  adventure?: AdventureType,
): string | undefined {
  switch (adventure) {
    case "team":
      return `${puzzleLabel} resuelto con buen ritmo. Si el mapa muestra retos secundarios, solo explorad si el cuaderno ya os da contexto.`;
    case "mystery":
      return `«${puzzleLabel}» encaja en el informe. Si hay rama secundaria, tratadla como evidencia opcional, no como salida.`;
    case "birthday":
      return `Avanzáis con mimo en «${puzzleLabel}». Disfrutad la escena antes de lanzaros a todo lo demás.`;
    case "celebration":
      return `¡Buen paso en «${puzzleLabel}»! El ambiente os da margen; no os disperséis sin mirar el cuaderno.`;
    default:
      return `Buen ritmo con «${puzzleLabel}». Id con calma: lo opcional no debería frenar la salida.`;
  }
}