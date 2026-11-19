import {
  MAX_EVENT_TEAMS,
  MIN_EVENT_TEAMS,
  type AdventureType,
  type EventDurationMin,
} from "@escapeai/shared";

const ADVENTURE_TYPES: AdventureType[] = ["birthday", "celebration", "mystery", "team"];

export function parsePlayableFacts(facts: string): string[] {
  return facts
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Espeja reglas de `validateCreateEvent` en API para feedback antes de enviar. */
export function validateCreateEventClient(input: {
  adventureType: AdventureType;
  teamCount: number;
  durationMin: EventDurationMin;
  subjectName: string;
  facts: string;
}): string | undefined {
  if (!ADVENTURE_TYPES.includes(input.adventureType)) {
    return "Tipo de aventura no válido.";
  }
  if (input.teamCount < MIN_EVENT_TEAMS || input.teamCount > MAX_EVENT_TEAMS) {
    return `El número de equipos debe estar entre ${MIN_EVENT_TEAMS} y ${MAX_EVENT_TEAMS}.`;
  }
  if (![30, 45, 60].includes(input.durationMin)) {
    return "Duración no válida.";
  }
  const name = input.subjectName.trim();
  if (name.length < 2) {
    return "Indica el nombre central (mínimo 2 caracteres).";
  }
  if (parsePlayableFacts(input.facts).length < 1) {
    return "Añade al menos un dato jugable (una línea por anécdota o lugar).";
  }
  return undefined;
}

export function clampTeamCount(raw: number): number {
  if (!Number.isFinite(raw)) return MIN_EVENT_TEAMS;
  return Math.min(MAX_EVENT_TEAMS, Math.max(MIN_EVENT_TEAMS, Math.round(raw)));
}