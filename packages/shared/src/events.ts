export const MAX_EVENT_PLAYERS = 20;

export type AdventureType = "birthday" | "celebration" | "mystery" | "team";

export type EventSubject = {
  /** Persona, pareja, marca o nombre del evento (hilo narrativo). */
  name: string;
  /** Apodo o forma corta para voz, objetos y pistas. */
  nickname?: string;
  /**
   * Cifra clave opcional (aniversario, año simbólico, número interno…).
   * Si no hay año en `facts`, se usa rellenada a 4 dígitos para códigos.
   */
  age?: number;
};

export type CreateEventRequest = {
  adventureType: AdventureType;
  playerCount: number;
  subject: EventSubject;
  /** Datos jugables (anécdotas, lugares, apodos…) — alimentan pistas YAML. */
  facts: string[];
  eventTitle?: string;
};

export type AdventureTemplateInfo = {
  id: AdventureType;
  title: string;
  description: string;
  suggestedFacts: string[];
};

export type EventPreview = {
  joinCode: string;
  eventId: string;
  title: string;
  adventureType: AdventureType;
  playerCount: number;
  roomName: string;
  timeLimitSec: number;
  sceneCount: number;
  joinedPlayers: number;
};

export type JoinEventRequest = {
  displayName: string;
};

export type JoinEventResponse = {
  playerId: string;
  slot: number;
  joinCode: string;
  eventTitle: string;
};

export type EventPlayerPublic = {
  playerId: string;
  displayName: string;
  slot: number;
  status: "waiting" | "playing" | "won" | "lost";
  timeRemainingSec?: number;
};

export type EventLeaderboard = {
  joinCode: string;
  title: string;
  players: EventPlayerPublic[];
};

export type CreateSessionRequest =
  | { roomId: string }
  | { eventCode: string; playerId: string };
