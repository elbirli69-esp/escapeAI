import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoomFromFile, type RoomDefinition } from "@escapeai/escape-engine";

const roomsDir = join(dirname(fileURLToPath(import.meta.url)), "rooms");

export function getPilotRoom(): RoomDefinition {
  return loadRoomFromFile(join(roomsDir, "pilot.yaml"));
}

export function listRoomIds(): string[] {
  return ["pilot"];
}

export function loadRoomById(roomId: string): RoomDefinition {
  if (roomId === "pilot") return getPilotRoom();
  throw new Error(`Unknown room: ${roomId}`);
}
