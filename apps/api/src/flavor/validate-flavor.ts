import type { RoomDefinition } from "@escapeai/escape-engine";

export type FlavorField = "description" | "mood" | "tagline" | "name";

const FOUR_DIGIT = /\b\d{4}\b/;

export function collectRoomSecrets(room: RoomDefinition): string[] {
  const secrets = new Set<string>();
  for (const puzzle of Object.values(room.puzzles)) {
    if (puzzle.answer && puzzle.answer.length >= 2) {
      secrets.add(puzzle.answer.trim());
    }
    if (puzzle.voiceLocale && puzzle.answer) {
      secrets.add(puzzle.answer.trim());
    }
  }
  return [...secrets];
}

export function validateFlavorText(
  text: string,
  secrets: string[],
  opts?: { maxLength?: number },
): string | undefined {
  const maxLength = opts?.maxLength ?? 720;
  if (!text.trim()) return "texto vacío";
  if (text.length > maxLength) return "texto demasiado largo";
  if (FOUR_DIGIT.test(text)) return "contiene secuencia de cuatro dígitos";

  const upper = text.toUpperCase();
  for (const secret of secrets) {
    const s = secret.toUpperCase();
    if (s.length >= 4 && upper.includes(s)) return "filtra respuesta de puzzle";
    if (s.length === 4 && /^\d+$/.test(s) && upper.includes(s)) return "filtra código";
  }
  return undefined;
}

export function isFlavorTextSafe(text: string, secrets: string[]): boolean {
  return validateFlavorText(text, secrets) === undefined;
}
