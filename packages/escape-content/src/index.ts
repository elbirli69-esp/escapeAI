import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoomFromFile, type RoomDefinition } from "@escapeai/escape-engine";
import { generateAdventureRoom, listAdventureTemplates } from "./generate-adventure.js";
import { ROOM_CATALOG, ROOM_FILES, type RoomId } from "./rooms.js";

const roomsDir = join(dirname(fileURLToPath(import.meta.url)), "rooms");

export { ROOM_CATALOG, ROOM_FILES, type RoomId };

export function getPilotRoom(): RoomDefinition {
  return loadRoomById("pilot");
}

export function listRoomIds(): RoomId[] {
  return Object.keys(ROOM_FILES) as RoomId[];
}

export function loadRoomById(roomId: string): RoomDefinition {
  const file = ROOM_FILES[roomId as RoomId];
  if (!file) throw new Error(`Unknown room: ${roomId}`);
  return loadRoomFromFile(join(roomsDir, file));
}

export { generateAdventureRoom, listAdventureTemplates };
export { buildSpatialRoom } from "./spatial/build-room.js";
export { pickProposal, proposeSpatialAdventures, proposeSpatialAdventuresResponse } from "./spatial/generate-proposals.js";
