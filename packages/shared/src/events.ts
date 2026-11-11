export const MAX_EVENT_PLAYERS = 20;

export type AdventureType = "birthday" | "celebration" | "mystery" | "team";

export type EventSubject = {
  name: string;
  age?: number;
  nickname?: string;
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
