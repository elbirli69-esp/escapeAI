import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRoomDefinition } from "@escapeai/escape-engine";
import { ROOM_FILES } from "./rooms.js";

const roomsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "rooms");

export function validateAllRooms(): void {
  const errors: string[] = [];

  for (const [roomId, fileName] of Object.entries(ROOM_FILES)) {
    const path = join(roomsDir, fileName);
    try {
      const room = parseRoomDefinition(readFileSync(path, "utf8"));
      if (room.id !== roomId) {
        errors.push(`${fileName}: id '${room.id}' no coincide con catálogo '${roomId}'`);
      }
      validateRoomContent(roomId, room, errors);
    } catch (err) {
      errors.push(`${fileName}: ${(err as Error).message}`);
    }
  }

  const yamlFiles = readdirSync(roomsDir).filter((f) => f.endsWith(".yaml"));
  for (const file of yamlFiles) {
    if (!(Object.values(ROOM_FILES) as string[]).includes(file)) {
      errors.push(`${file}: existe en disco pero no está en ROOM_FILES (añádelo al catálogo)`);
    }
  }

  if (errors.length > 0) {
    console.error("Validación de salas fallida:\n");
    for (const line of errors) console.error(`  • ${line}`);
    process.exit(1);
  }

  console.log(`OK: ${Object.keys(ROOM_FILES).length} sala(s) validadas.`);
}

const isCli = process.argv[1]?.includes("validate-rooms");
if (isCli) validateAllRooms();

function validateRoomContent(
  roomId: string,
  room: ReturnType<typeof parseRoomDefinition>,
  errors: string[],
): void {
  const prefix = `${roomId}`;

  if (room.winCondition.type === "puzzle_solved") {
    const pid = room.winCondition.puzzleId;
    if (!room.puzzles[pid]) {
      errors.push(`${prefix}: winCondition apunta a puzzle desconocido '${pid}'`);
    }
  }

  for (const puzzle of Object.values(room.puzzles)) {
    if (puzzle.type === "code" && !puzzle.answer) {
      errors.push(`${prefix}: puzzle '${puzzle.id}' (code) sin answer`);
    }
    if (puzzle.type === "inventory" && !puzzle.requiresItem) {
      errors.push(`${prefix}: puzzle '${puzzle.id}' (inventory) sin requiresItem`);
    }
    const hints = puzzle.hints ?? [];
    for (let i = 0; i < hints.length; i++) {
      if (hints[i].level !== i + 1) {
        errors.push(
          `${prefix}: puzzle '${puzzle.id}' pista índice ${i} debería tener level ${i + 1}`,
        );
      }
    }
    if (hints.length > 0 && (puzzle.maxHints ?? hints.length) < hints.length) {
      errors.push(`${prefix}: puzzle '${puzzle.id}' maxHints menor que número de pistas`);
    }
  }

  for (const scene of Object.values(room.scenes)) {
    for (const itemId of scene.items ?? []) {
      if (!room.items?.[itemId]) {
        errors.push(`${prefix}: escena '${scene.id}' referencia item '${itemId}' sin definir en items`);
      }
    }
  }
}
