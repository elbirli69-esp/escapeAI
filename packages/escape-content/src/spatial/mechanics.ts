import type {
  EnvironmentConstraints,
  EscapeObjectCategory,
  ScannedEnvironment,
  SpatialMechanicId,
  SpatialPrepItem,
} from "@escapeai/shared";

export type MechanicDefinition = {
  id: SpatialMechanicId;
  label: string;
  preferredCategories: EscapeObjectCategory[];
  sensory: "camera" | "code" | "sound" | "visual" | "inventory" | "voice";
  needsPrepByDefault: boolean;
  baseDifficulty: number;
};

export const MECHANIC_CATALOG: MechanicDefinition[] = [
  {
    id: "CLOCK_OBSERVATION",
    label: "Observar la hora del reloj",
    preferredCategories: ["clock"],
    sensory: "camera",
    needsPrepByDefault: true,
    baseDifficulty: 2,
  },
  {
    id: "BOOK_SEARCH",
    label: "Buscar un libro concreto",
    preferredCategories: ["book", "bookshelf"],
    sensory: "camera",
    needsPrepByDefault: false,
    baseDifficulty: 2,
  },
  {
    id: "OBJECT_COUNT",
    label: "Contar objetos en la sala",
    preferredCategories: ["chair", "book", "plant", "decoration"],
    sensory: "code",
    needsPrepByDefault: false,
    baseDifficulty: 1,
  },
  {
    id: "LOCATION_DISCOVERY",
    label: "Encontrar un objeto en su sitio",
    preferredCategories: ["plant", "sofa", "tv", "lamp", "table"],
    sensory: "camera",
    needsPrepByDefault: false,
    baseDifficulty: 2,
  },
  {
    id: "OCR_CLUE",
    label: "Leer una inscripción",
    preferredCategories: ["book", "painting", "decoration", "clock"],
    sensory: "camera",
    needsPrepByDefault: true,
    baseDifficulty: 3,
  },
  {
    id: "VISUAL_DETAIL",
    label: "Detalle en cuadro o decoración",
    preferredCategories: ["painting", "decoration", "tv"],
    sensory: "visual",
    needsPrepByDefault: false,
    baseDifficulty: 2,
  },
  {
    id: "COLOR_SEQUENCE",
    label: "Secuencia de colores en objetos",
    preferredCategories: ["plant", "book", "decoration", "chair"],
    sensory: "code",
    needsPrepByDefault: true,
    baseDifficulty: 3,
  },
  {
    id: "QR_CHECKIN",
    label: "Escanear QR colocado",
    preferredCategories: ["plant", "bookshelf", "door", "table"],
    sensory: "camera",
    needsPrepByDefault: true,
    baseDifficulty: 2,
  },
  {
    id: "AUDIO_LOCATION",
    label: "Audio que indica una zona",
    preferredCategories: ["table", "sofa", "plant"],
    sensory: "sound",
    needsPrepByDefault: false,
    baseDifficulty: 2,
  },
];

export type MechanicOpportunity = {
  mechanicId: SpatialMechanicId;
  score: number;
  objectIds: string[];
  objectLabels: string[];
  usesExistingObject: boolean;
  requiresPrep: boolean;
  prep: SpatialPrepItem[];
};

function countConfirmed(env: ScannedEnvironment, categories: EscapeObjectCategory[]): number {
  return env.objects
    .filter((o) => o.confirmed && categories.includes(o.category))
    .reduce((s, o) => s + o.quantity, 0);
}

function labelsFor(env: ScannedEnvironment, categories: EscapeObjectCategory[]): string[] {
  return env.objects
    .filter((o) => o.confirmed && categories.includes(o.category))
    .map((o) => o.label ?? o.category);
}

export function scoreMechanicForEnvironment(
  mechanic: MechanicDefinition,
  env: ScannedEnvironment,
  constraints: EnvironmentConstraints,
): MechanicOpportunity {
  const matches = env.objects.filter(
    (o) => o.confirmed && mechanic.preferredCategories.includes(o.category),
  );
  const count = countConfirmed(env, mechanic.preferredCategories);
  const labels = labelsFor(env, mechanic.preferredCategories);

  let score = 0;
  if (count > 0) score += 40;
  if (count >= 2) score += 15;
  const interactable = matches.some((o) => o.interactable);
  if (interactable) score += 20;
  if (matches.some((o) => o.canHideClue)) score += 10;
  score += Math.max(0, 30 - mechanic.baseDifficulty * 8);

  const requiresPrep =
    mechanic.needsPrepByDefault ||
    (mechanic.id === "BOOK_SEARCH" && !matches.some((o) => o.category === "book")) ||
    (mechanic.id === "CLOCK_OBSERVATION" && count === 0);

  const prep: SpatialPrepItem[] = [];
  if (requiresPrep && constraints.organizerCanPlaceProps) {
    if (mechanic.id === "CLOCK_OBSERVATION") {
      prep.push({ kind: "organizer_setup", text: "Ajusta el reloj a la hora indicada en la ficha de preparación." });
    }
    if (mechanic.id === "QR_CHECKIN") {
      prep.push({ kind: "organizer_setup", text: "Imprime o escribe un QR/código junto al objeto señalado en la partida." });
    }
    if (mechanic.id === "OCR_CLUE") {
      prep.push({ kind: "organizer_setup", text: "Deja visible un texto impreso (etiqueta, cartel) cerca del objeto." });
    }
    if (mechanic.id === "COLOR_SEQUENCE") {
      prep.push({ kind: "organizer_setup", text: "Coloca cinta o stickers de colores en el orden del enigma (ficha)." });
    }
  }

  if (count === 0) {
    score = Math.min(score, 25);
    prep.push({
      kind: "organizer_setup",
      text: `Señala manualmente un ${mechanic.preferredCategories[0] ?? "objeto"} para esta prueba.`,
    });
  }

  return {
    mechanicId: mechanic.id,
    score,
    objectIds: matches.map((o) => o.id),
    objectLabels: labels,
    usesExistingObject: count > 0,
    requiresPrep: prep.length > 0,
    prep,
  };
}

export function listMechanicOpportunities(env: ScannedEnvironment): MechanicOpportunity[] {
  return MECHANIC_CATALOG.map((m) => scoreMechanicForEnvironment(m, env, env.constraints)).sort(
    (a, b) => b.score - a.score,
  );
}
