import type {
  ScannedEnvironment,
  SpatialAdventureProposal,
  SpatialArchetype,
  SpatialPuzzlePlan,
  SpatialProposalsResponse,
} from "@escapeai/shared";
import {
  deriveBookKeyword,
  deriveClockDigits,
  deriveColorSequence,
  deriveCountAnswer,
  deriveOcrDigit,
  derivePlantKeyword,
  deriveQrAnswer,
  deriveVisualCount,
} from "./derive-answers.js";
import { listMechanicOpportunities } from "./mechanics.js";

function uniqueLabels(env: ScannedEnvironment, categories: string[]): string[] {
  const labels = env.objects
    .filter((o) => o.confirmed && categories.includes(o.category))
    .map((o) => o.label ?? o.category);
  return [...new Set(labels)];
}

function buildTemporalProposal(env: ScannedEnvironment): SpatialAdventureProposal {
  const clockHour = deriveClockDigits(env, "temporal");
  const bookWord = deriveBookKeyword(env);
  const finalDigits = `${clockHour}${deriveOcrDigit(env, "temporal")}`.slice(0, 4);

  const puzzles: SpatialPuzzlePlan[] = [
    {
      puzzleId: "spatial_clock",
      mechanicId: "CLOCK_OBSERVATION",
      label: "Hora del reloj",
      objectCategories: ["clock"],
      usesExistingObject: env.objects.some((o) => o.confirmed && o.category === "clock"),
      clueOutput: { clueId: "clock_hour", outputType: "digit", validationRule: "exact" },
      prep: [{ kind: "organizer_setup", text: `Ajusta el reloj a las ${clockHour}:00 (o deja visible esa hora).` }],
    },
    {
      puzzleId: "spatial_book",
      mechanicId: "BOOK_SEARCH",
      label: "Libro señalado",
      objectCategories: ["book", "bookshelf"],
      usesExistingObject: env.objects.some((o) => o.confirmed && ["book", "bookshelf"].includes(o.category)),
      clueOutput: { clueId: "book_word", outputType: "word", validationRule: "exact" },
      requiredClues: ["clock_hour"],
    },
    {
      puzzleId: "spatial_final",
      mechanicId: "OBJECT_COUNT",
      label: "Candado final",
      objectCategories: ["table"],
      usesExistingObject: true,
      clueOutput: { clueId: "final_code", outputType: "sequence", validationRule: "ordered_sequence" },
      requiredClues: ["clock_hour", "book_word"],
    },
  ];

  return {
    id: "spatial-temporal",
    archetype: "temporal",
    title: `El secreto de la hora en ${env.name}`,
    premise: `Algo en ${env.name} solo se revela cuando la hora del reloj encaja con una palabra escondida entre los libros.`,
    mystery: "¿Qué mensaje guardan el reloj y el estante?",
    durationMin: 45,
    puzzleCount: puzzles.length,
    difficulty: "medium",
    objectsUsed: uniqueLabels(env, ["clock", "book", "bookshelf", "table"]),
    sensoryMechanics: ["CLOCK_OBSERVATION", "BOOK_SEARCH", "OBJECT_COUNT"],
    prepChecklist: puzzles.flatMap((p) => p.prep ?? []),
    endingDescription: `El candado final combina la hora (${clockHour}) y la palabra «${bookWord}» → código ${finalDigits}.`,
    puzzles,
  };
}

function buildInventoryProposal(env: ScannedEnvironment): SpatialAdventureProposal {
  const chairCount = deriveCountAnswer(env, "chair");
  const plantWord = derivePlantKeyword(env);
  const labels = uniqueLabels(env, ["chair", "plant", "table", "sofa"]);

  const puzzles: SpatialPuzzlePlan[] = [
    {
      puzzleId: "spatial_count",
      mechanicId: "OBJECT_COUNT",
      label: "Conteo en la sala",
      objectCategories: ["chair"],
      usesExistingObject: env.objects.some((o) => o.confirmed && o.category === "chair"),
      clueOutput: { clueId: "chair_count", outputType: "digit", validationRule: "exact" },
    },
    {
      puzzleId: "spatial_plant",
      mechanicId: "LOCATION_DISCOVERY",
      label: "Ubicación de la planta",
      objectCategories: ["plant"],
      usesExistingObject: env.objects.some((o) => o.confirmed && o.category === "plant"),
      clueOutput: { clueId: "plant_zone", outputType: "word", validationRule: "exact" },
      requiredClues: ["chair_count"],
    },
    {
      puzzleId: "spatial_audio",
      mechanicId: "AUDIO_LOCATION",
      label: "Mensaje en el altavoz",
      objectCategories: ["table", "sofa"],
      usesExistingObject: labels.length > 0,
      clueOutput: { clueId: "audio_hint", outputType: "location" },
      requiredClues: ["plant_zone"],
    },
  ];

  return {
    id: "spatial-inventory",
    archetype: "inventory_hunt",
    title: `Rastro de sillas en ${env.name}`,
    premise: "Primero hay que contar; luego buscar la planta; el audio cierra el circuito.",
    mystery: "¿Qué cantidad esconde el camino hacia la planta?",
    durationMin: 45,
    puzzleCount: puzzles.length,
    difficulty: "easy",
    objectsUsed: labels,
    sensoryMechanics: ["OBJECT_COUNT", "LOCATION_DISCOVERY", "AUDIO_LOCATION"],
    prepChecklist: [],
    endingDescription: `Respuestas: ${chairCount} sillas → buscar «${plantWord}» → repetir la zona en voz alta.`,
    puzzles,
  };
}

function buildVisualProposal(env: ScannedEnvironment): SpatialAdventureProposal {
  const ocrDigit = deriveOcrDigit(env, "visual");
  const qrCode = deriveQrAnswer("visual");
  const colors = deriveColorSequence(env, "visual");
  const visualN = deriveVisualCount(env, "painting");

  const puzzles: SpatialPuzzlePlan[] = [
    {
      puzzleId: "spatial_visual",
      mechanicId: "VISUAL_DETAIL",
      label: "Detalle en la pared",
      objectCategories: ["painting", "decoration"],
      usesExistingObject: env.objects.some((o) =>
        o.confirmed && ["painting", "decoration"].includes(o.category),
      ),
      clueOutput: { clueId: "visual_n", outputType: "digit" },
    },
    {
      puzzleId: "spatial_ocr",
      mechanicId: "OCR_CLUE",
      label: "Texto impreso",
      objectCategories: ["decoration", "book"],
      usesExistingObject: env.objects.some((o) => o.confirmed && ["decoration", "book"].includes(o.category)),
      clueOutput: { clueId: "ocr_digit", outputType: "digit", validationRule: "exact" },
      requiredClues: ["visual_n"],
      prep: [{ kind: "organizer_setup", text: "Deja un cartel con un número visible cerca del objeto decorativo." }],
    },
    {
      puzzleId: "spatial_color",
      mechanicId: "COLOR_SEQUENCE",
      label: "Secuencia cromática",
      objectCategories: ["plant", "chair", "book"],
      usesExistingObject: true,
      clueOutput: { clueId: "color_seq", outputType: "sequence" },
      requiredClues: ["ocr_digit"],
      prep: [{ kind: "organizer_setup", text: `Marca tres objetos con colores en orden ${colors[0]}-${colors[1]}-${colors[2]}.` }],
    },
    {
      puzzleId: "spatial_qr",
      mechanicId: "QR_CHECKIN",
      label: "Check-in QR",
      objectCategories: ["plant", "table"],
      usesExistingObject: env.constraints.organizerCanPlaceProps,
      requiredClues: ["color_seq"],
      prep: [{ kind: "organizer_setup", text: `Coloca un QR o etiqueta con el texto «${qrCode}».` }],
    },
  ];

  return {
    id: "spatial-visual",
    archetype: "visual_trace",
    title: `Huellas visuales en ${env.name}`,
    premise: "Cuadros, texto y colores guían hasta un check-in final en el espacio real.",
    mystery: "¿Qué secuencia de detalles abre la salida?",
    durationMin: 60,
    puzzleCount: puzzles.length,
    difficulty: "hard",
    objectsUsed: uniqueLabels(env, ["painting", "decoration", "plant", "book"]),
    sensoryMechanics: ["VISUAL_DETAIL", "OCR_CLUE", "COLOR_SEQUENCE", "QR_CHECKIN"],
    prepChecklist: puzzles.flatMap((p) => p.prep ?? []),
    endingDescription: `Cuenta ${visualN} detalles, OCR da ${ocrDigit}, colores ${colors}, QR «${qrCode}».`,
    puzzles,
  };
}

const BUILDERS: Record<SpatialArchetype, (env: ScannedEnvironment) => SpatialAdventureProposal> = {
  temporal: buildTemporalProposal,
  inventory_hunt: buildInventoryProposal,
  visual_trace: buildVisualProposal,
};

export function proposeSpatialAdventures(env: ScannedEnvironment): SpatialAdventureProposal[] {
  listMechanicOpportunities(env);
  return (["temporal", "inventory_hunt", "visual_trace"] as const).map((a) => BUILDERS[a](env));
}

export function proposeSpatialAdventuresResponse(env: ScannedEnvironment): SpatialProposalsResponse {
  return {
    scannedEnvironmentId: env.id,
    inventoryVersion: env.version,
    proposals: proposeSpatialAdventures(env),
  };
}

export function pickProposal(
  env: ScannedEnvironment,
  proposalId: string,
): SpatialAdventureProposal | undefined {
  return proposeSpatialAdventures(env).find((p) => p.id === proposalId);
}
