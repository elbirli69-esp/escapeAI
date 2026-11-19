import type { AdventureType, PlayerRoleId } from "@escapeai/shared";

export type PlayerContext = {
  displayName: string;
  eventId: string;
  /** Miembro del equipo (dispositivo); en equipos clásicos coincide con teamId. */
  playerId: string;
  teamId: string;
  joinCode: string;
  slot: number;
  eventTitle?: string;
  adventureType?: AdventureType;
  playerRole?: PlayerRoleId;
  asymmetricRoles?: boolean;
};
