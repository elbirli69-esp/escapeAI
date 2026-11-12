import { readFileSync } from "node:fs";
import { parse } from "yaml";
import type { RoomDefinition } from "./room-definition.js";

export function parseRoomDefinition(source: string): RoomDefinition {
  const doc = parse(source) as RoomDefinition;
  validateRoom(doc);
  return doc;
}

export function loadRoomFromFile(filePath: string): RoomDefinition {
  return parseRoomDefinition(readFileSync(filePath, "utf8"));
}

function validateRoom(room: RoomDefinition): void {
  if (!room.id || !room.scenes[room.startSceneId]) {
    throw new Error("Invalid room: missing id or start scene");
  }
  for (const scene of Object.values(room.scenes)) {
    for (const exit of scene.exits ?? []) {
      if (!room.scenes[exit.toSceneId]) {
        throw new Error(`Invalid exit to unknown scene: ${exit.toSceneId}`);
      }
    }
    for (const puzzleId of scene.puzzles ?? []) {
      if (!room.puzzles[puzzleId]) {
        throw new Error(`Unknown puzzle ${puzzleId} in scene ${scene.id}`);
      }
    }
    for (const characterId of scene.characters ?? []) {
      if (!room.characters?.[characterId]) {
        throw new Error(`Unknown character ${characterId} in scene ${scene.id}`);
      }
    }
  }
  for (const puzzle of Object.values(room.puzzles)) {
    if (puzzle.type !== "location") continue;
    const mode = puzzle.locationMode ?? "reach";
    if (mode !== "reach" && mode !== "quiz") {
      throw new Error(`Puzzle ${puzzle.id}: locationMode inválido`);
    }
    if (puzzle.targetLat === undefined || puzzle.targetLon === undefined) {
      throw new Error(`Puzzle ${puzzle.id}: targetLat y targetLon son obligatorios`);
    }
    if (mode === "quiz" && !puzzle.answer?.trim()) {
      throw new Error(`Puzzle ${puzzle.id}: modo quiz requiere answer`);
    }
  }
}
