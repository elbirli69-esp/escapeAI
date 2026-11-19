import type { RoomDefinition } from "@escapeai/escape-engine";

type Codes = { letterCode: string; yearCode: string };

/** P6-B: acto 2 con dos roles + candado de fusión (inspiración «La cura del virus»). */
export function applyTeamAsymmetricRoles(room: RoomDefinition, codes: Codes): void {
  const chunkA = codes.letterCode.slice(0, 2).toUpperCase();
  const chunkB = codes.letterCode.slice(2, 4).toUpperCase();
  const fusion = codes.letterCode.slice(0, 4).toUpperCase();

  const middle = room.scenes.middle;
  if (!middle) return;

  middle.description = `${middle.description.trim()} Hay dos puestos: laboratorio y campo. Cada móvil ve un candado distinto; el suero final exige combinar lo que anotéis en el diario.`;
  middle.items = [];
  middle.puzzles = ["role_research_vial", "role_field_sample", "coop_serum"];
  middle.exits = [
    {
      toSceneId: "finale",
      label: "Abrir la cámara de síntesis",
      when: { type: "puzzle_solved", puzzleId: "coop_serum" },
    },
  ];

  room.puzzles.role_research_vial = {
    id: "role_research_vial",
    type: "code",
    label: "Cultivo (laboratorio)",
    visibleToRoles: ["researcher"],
    prompt: "El cultivo requiere las dos letras que solo ve el rol de laboratorio.",
    interactionHints: [
      "En el móvil del investigador/a: anota la secuencia en el diario — tu compañero/a de campo no ve esta pantalla.",
      "Comparte en voz alta las letras; no hace falta enviar capturas.",
    ],
    answer: chunkA,
    normalize: "uppercase",
    maxHints: 1,
    hints: [{ level: 1, text: "Son las dos primeras letras del código de equipo de esta aventura." }],
    onSolve: {
      grantClue: {
        id: "role_lab_seq",
        text: `Secuencia de laboratorio: ${chunkA}. El suero necesita también la muestra de campo.`,
      },
    },
  };

  room.puzzles.role_field_sample = {
    id: "role_field_sample",
    type: "code",
    label: "Muestra (campo)",
    visibleToRoles: ["field"],
    prompt: "La muestra del terreno aporta el segundo par de letras.",
    interactionHints: [
      "En el móvil de campo: esta pista no aparece en el dispositivo del laboratorio.",
    ],
    answer: chunkB,
    normalize: "uppercase",
    maxHints: 1,
    hints: [{ level: 1, text: "Par de letras 3–4 del código de equipo." }],
    onSolve: {
      grantClue: {
        id: "role_field_seq",
        text: `Muestra validada: ${chunkB}. Falta mezclar con la secuencia del laboratorio.`,
      },
    },
  };

  room.puzzles.coop_serum = {
    id: "coop_serum",
    type: "code",
    label: "Síntesis del suero",
    prompt:
      "Fusiona en orden laboratorio + campo (cuatro letras). Necesitas las pistas «role_lab_seq» y «role_field_seq» en el diario — una puede venir del otro móvil.",
    interactionHints: [
      "Cooperación obligatoria: ningún rol puede completar el suero sin las dos pistas del cuaderno.",
    ],
    answer: fusion,
    normalize: "uppercase",
    requiresClueIds: ["role_lab_seq", "role_field_seq"],
    maxHints: 1,
    hints: [{ level: 1, text: `Concatena lo que anotó cada rol: ${chunkA} + ${chunkB}.` }],
    onSolve: {
      grantClue: {
        id: "serum_ready",
        text: "Suero estabilizado. La salida final del equipo está desbloqueada.",
      },
    },
  };

  room.beats = [
    ...(room.beats ?? []),
    {
      id: "asymmetric_roles_brief",
      after: "session_started",
      text: "Recordad: hay un móvil de laboratorio y otro de campo. Compartid lo que cada pantalla muestra antes del candado de síntesis.",
    },
  ];
}