import type { CreateEventRequest } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";

type Codes = { letterCode: string };

/** P6-D: segundo acto «rescate» tras cerrar acto 1 (misma partida / eventId). */
export function applySagaTwoActs(
  room: RoomDefinition,
  input: CreateEventRequest,
  codes: Codes,
): void {
  const act1PuzzleId =
    input.adventureType === "mystery" && room.puzzles.case_accusation
      ? "case_accusation"
      : "final_code";

  room.sagaTwoActs = true;
  room.sagaAct1PuzzleId = act1PuzzleId;
  room.winCondition = { type: "puzzle_solved", puzzleId: "saga_rescue_code" };

  const finale = room.scenes.finale;
  if (!finale) return;

  const rescueLetters = codes.letterCode.slice(0, 2).toUpperCase();
  finale.exits = [
    ...(finale.exits ?? []),
    {
      toSceneId: "finale_b",
      label: "Continuar misión (acto 2)",
      when: { type: "saga_finale_unlocked", act1PuzzleId },
    },
  ];

  room.scenes.finale_b = {
    id: "finale_b",
    title: "Acto 2 — El rescate",
    image: finale.image,
    mood: "La calma tensa tras el primer cierre: un último código antes del epílogo.",
    description:
      "El organizador ha abierto el acto 2. Un destino pendiente exige el mismo espíritu de equipo que el acto 1.",
    puzzles: ["saga_rescue_code"],
    exits: [],
  };

  room.puzzles.saga_rescue_code = {
    id: "saga_rescue_code",
    type: "code",
    label: "Código de rescate",
    prompt: `Cierra la saga con las dos primeras letras del código de equipo (${rescueLetters[0]}…). Victoria solo aquí.`,
    interactionHints: [
      "Acto 2: repasa las iniciales del evento; son las dos primeras letras del candado de cuatro del acto 1.",
      "Comparte en voz alta si hay varios móviles — el organizador controla cuándo abrir este acto.",
    ],
    answer: rescueLetters,
    normalize: "uppercase",
    onSolve: {
      grantClue: {
        id: "saga_complete",
        text: "Misión completa: acto 1 y rescate sellados en el mismo evento.",
      },
    },
    maxHints: 1,
    hints: [{ level: 1, text: "Dos letras, las mismas que abren el código final del acto 1." }],
  };

  if (act1PuzzleId === "final_code" && room.puzzles.final_code) {
    room.puzzles.final_code.prompt = `${room.puzzles.final_code.prompt} Cierra el acto 1; la victoria oficial llegará en el rescate.`;
    room.puzzles.final_code.interactionHints = [
      ...(room.puzzles.final_code.interactionHints ?? []),
      "Tras resolver, espera a que el organizador libere el acto 2 antes de continuar.",
    ];
  }

  room.beats = [
    ...(room.beats ?? []),
    {
      id: "saga-act1-gate",
      after: "puzzle_solved",
      puzzleId: act1PuzzleId,
      text: "Acto 1 resuelto. El organizador puede liberar el rescate cuando el grupo esté listo.",
    },
    {
      id: "saga-act2-enter",
      after: "scene_entered",
      sceneId: "finale_b",
      text: "Acto 2 en marcha: el rescate es el último candado de la saga.",
    },
  ];
}