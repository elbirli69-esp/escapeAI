import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoomFromFile, type RoomDefinition } from "@escapeai/escape-engine";
import { generateAdventureRoom, listAdventureTemplates } from "./generate-adventure.js";
import { applyCatalogDailyVariant } from "./daily-variant.js";
import { ROOM_CATALOG, ROOM_FILES, type RoomId } from "./rooms.js";

const roomsDir = join(dirname(fileURLToPath(import.meta.url)), "rooms");

export { ROOM_CATALOG, ROOM_FILES, type RoomId };
export {
  listLobbyHomeModes,
  type LobbyHomeModeId,
  type LobbyHomeModeInfo,
} from "./lobby-home-modes.js";

export function getPilotRoom(): RoomDefinition {
  return loadRoomById("pilot");
}

export function listRoomIds(): RoomId[] {
  return Object.keys(ROOM_FILES) as RoomId[];
}

const CATALOG_DAILY_IDS = new Set<RoomId>(["pilot", "lighthouse"]);

export function loadRoomById(
  roomId: string,
  opts?: { dailyVariant?: boolean; at?: Date },
): RoomDefinition {
  const file = ROOM_FILES[roomId as RoomId];
  if (!file) throw new Error(`Unknown room: ${roomId}`);
  let room = loadRoomFromFile(join(roomsDir, file));
  const useDaily = opts?.dailyVariant ?? CATALOG_DAILY_IDS.has(roomId as RoomId);
  if (useDaily && CATALOG_DAILY_IDS.has(roomId as RoomId)) {
    room = applyCatalogDailyVariant(room, roomId, opts?.at);
  }
  return room;
}

export { generateAdventureRoom, listAdventureTemplates };
export { dailyPlaySeed } from "./play-seed.js";
export { applyCatalogDailyVariant } from "./daily-variant.js";
export { buildSpatialRoom } from "./spatial/build-room.js";
export { buildSpatialSiteRoom } from "./spatial/build-site-room.js";
export { pickProposal, proposeSpatialAdventures, proposeSpatialAdventuresResponse } from "./spatial/generate-proposals.js";
export {
  pickSiteProposal,
  proposeSiteAdventures,
  proposeSiteAdventuresResponse,
} from "./spatial/generate-site-proposals.js";
