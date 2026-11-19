import type { PlayerRoleId } from "@escapeai/shared";
import type { RoomPuzzle } from "./room-definition.js";

export function puzzleVisibleToRole(puzzle: RoomPuzzle, role?: PlayerRoleId): boolean {
  if (!puzzle.visibleToRoles?.length) return true;
  if (!role) return false;
  return puzzle.visibleToRoles.includes(role);
}