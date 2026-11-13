/** MVP: competición por equipos (un móvil por equipo). */
export const MIN_EVENT_TEAMS = 2;
export const MAX_EVENT_TEAMS = 5;
/** @deprecated Usar MAX_EVENT_TEAMS; se mantiene por compatibilidad de tipos. */
export const MAX_EVENT_PLAYERS = 20;

export type AdventureType = "birthday" | "celebration" | "mystery" | "team";

export type EventDurationMin = 30 | 45 | 60;

export type EventSubject = {
  /** Persona, pareja, marca o nombre del evento (hilo narrativo). */
  name: string;
  nickname?: string;
  /** Cifra clave opcional (aniversario, año simbólico, número interno…). */
  age?: number;
};

export type CreateEventRequest = {
  adventureType: AdventureType;
  /** Inventario escaneado usado al crear el evento (snapshot de sala, no se actualiza con el inventario). */
  scannedEnvironmentId?: string;
  /** Recinto multi-habitación (snapshot de habitaciones enlazadas). */
  scannedSiteId?: string;
  siteVersion?: number;
  roomInventoryVersions?: Record<string, number>;
  inventoryVersion?: number;
  spatialProposalId?: string;
  /** Equipos que compiten (2–5). Un móvil por equipo. */
  teamCount: number;
  /** @deprecated Enviar teamCount. Si solo llega playerCount, se interpreta como teamCount acotado. */
  playerCount?: number;
  subject: EventSubject;
  facts: string[];
  eventTitle?: string;
  /** Duración orientativa de la partida. */
  durationMin?: EventDurationMin;
};

export type AdventureTemplateInfo = {
  id: AdventureType;
  title: string;
  description: string;
  suggestedFacts: string[];
  /** Portada local si Pexels no está configurado o falla. */
  coverImage?: string;
  /** Búsqueda Pexels para portada temática (API en servidor). */
  pexelsQuery?: string;
  /** `pexels` si la portada viene de stock; `fallback` si es media local. */
  coverImageSource?: "pexels" | "fallback";
  theme?: "urban" | "coastal" | string;
  tagline?: string;
};

export type EventPreview = {
  joinCode: string;
  eventId: string;
  title: string;
  adventureType: AdventureType;
  teamCount: number;
  roomName: string;
  timeLimitSec: number;
  sceneCount: number;
  joinedTeams: number;
  coverImage?: string;
  theme?: string;
};

export type JoinEventRequest = {
  /** Nombre del equipo en la competición. */
  displayName: string;
};

export type JoinEventResponse = {
  teamId: string;
  /** @deprecated Alias de teamId */
  playerId: string;
  slot: number;
  joinCode: string;
  eventTitle: string;
};

export type EventTeamPublic = {
  teamId: string;
  teamName: string;
  slot: number;
  status: "waiting" | "playing" | "won" | "lost";
  timeRemainingSec?: number;
  elapsedSec?: number;
  puzzlesSolved?: number;
  currentSceneId?: string;
  currentSceneTitle?: string;
};

export type EventSceneMilestone = {
  sceneId: string;
  sceneTitle: string;
  sceneNumber: number;
  teamsCount: number;
};

/** @deprecated Usar EventTeamPublic */
export type EventPlayerPublic = EventTeamPublic & {
  playerId: string;
  displayName: string;
};

export type EventLeaderboard = {
  joinCode: string;
  title: string;
  teams: EventTeamPublic[];
  adventureType?: AdventureType;
  coverImage?: string;
  theme?: string;
  /** Resumen para proyector: «3 equipos en escena 2 (…)». */
  progressSummary?: string;
  sceneMilestones?: EventSceneMilestone[];
  /** @deprecated */
  players?: EventTeamPublic[];
};

export type CreateSessionRequest =
  | { roomId: string }
  | { eventCode: string; teamId?: string; playerId?: string };

export function durationMinToSec(min: EventDurationMin = 45): number {
  return min * 60;
}

export function resolveDurationMin(config: { durationMin?: EventDurationMin }): EventDurationMin {
  const d = config.durationMin ?? 45;
  if (d === 30 || d === 60) return d;
  return 45;
}

export function resolveTeamCount(config: {
  teamCount?: number;
  playerCount?: number;
}): number {
  const raw = config.teamCount ?? config.playerCount ?? 4;
  return Math.min(MAX_EVENT_TEAMS, Math.max(MIN_EVENT_TEAMS, Math.floor(raw)));
}
