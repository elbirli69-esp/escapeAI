import type { AdventureType } from "@escapeai/shared";

export type PlayerContext = {
  displayName: string;
  eventId: string;
  playerId: string;
  joinCode: string;
  slot: number;
  eventTitle?: string;
  adventureType?: AdventureType;
};
