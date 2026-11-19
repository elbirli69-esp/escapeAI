import type { CreateEventRequest } from "@escapeai/shared";
import type { DeductionSuspect, RoomDefinition } from "@escapeai/escape-engine";

const SUSPECT_IDS = ["conserje", "vecina", "testigo", "socio"] as const;

export function pickWhodunitCulprit(eventId: string): (typeof SUSPECT_IDS)[number] {
  let hash = 0;
  for (const ch of eventId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SUSPECT_IDS[hash % SUSPECT_IDS.length];
}

export function buildWhodunitSuspects(
  input: CreateEventRequest,
  culpritId: string,
): DeductionSuspect[] {
  const nick = input.subject.nickname?.trim() || input.subject.name.split(/\s+/)[0] || "Testigo";
  const defs: Array<{ id: (typeof SUSPECT_IDS)[number]; name: string }> = [
    { id: "conserje", name: "Conserje del faro" },
    { id: "vecina", name: "Vecina de la costa" },
    { id: "testigo", name: `${nick} (coartada débil)` },
    { id: "socio", name: "Socio del club náutico" },
  ];
  const clues: Record<string, Record<string, string>> = {
    conserje: {
      t1: "suspect_conserje_keys",
      t2: "suspect_conserje_time",
    },
    vecina: {
      t1: "suspect_vecina_window",
      t2: "suspect_vecina_dog",
    },
    testigo: {
      t1: "suspect_testigo_call",
      t2: "suspect_testigo_alibi",
    },
    socio: {
      t1: "suspect_socio_ledger",
      t2: "suspect_socio_motive",
    },
  };

  return defs.map((d) => ({
    id: d.id,
    name: d.name,
    traits: [
      {
        id: `${d.id}_t1`,
        label: d.id === culpritId ? "Coartada inconsistente con el cuaderno" : "Coartada parcialmente verificada",
        clearingClueId: clues[d.id]!.t1,
      },
      {
        id: `${d.id}_t2`,
        label: d.id === culpritId ? "Motivo alineado con los datos del caso" : "Sin motivo claro en el dossier",
        clearingClueId: clues[d.id]!.t2,
      },
    ],
  }));
}

const WHODUNIT_REQUIRED_CLUES = [
  "suspect_conserje_keys",
  "suspect_vecina_window",
  "suspect_testigo_call",
];

/** P6-A: acusación final solo en `mystery`. */
export function applyMysteryWhodunit(room: RoomDefinition, input: CreateEventRequest, eventId: string): void {
  if (input.adventureType !== "mystery") return;

  const culpritId = pickWhodunitCulprit(eventId);
  const suspects = buildWhodunitSuspects(input, culpritId);
  const nick =
    input.subject.nickname?.trim() || input.subject.name.split(/\s+/)[0] || "protagonista";

  const entry = room.puzzles.entry_lock;
  if (entry?.onSolve) {
    entry.onSolve.grantClue = {
      id: "suspect_conserje_keys",
      text: "El conserje afirma no tener llaves, pero el candado del archivo las exigió.",
    };
  }

  const cam = room.puzzles.camera_hunt;
  if (cam) {
    cam.onSolve = {
      grantClue: {
        id: "suspect_vecina_window",
        text:
          "Foto validada: puedes coger el recuerdo. En el encuadre, la ventana de la vecina tenía la luz encendida.",
      },
    };
  }

  const slot = room.puzzles.token_slot;
  room.puzzles.token_slot = {
    ...slot!,
    onSolve: {
      grantClue: {
        id: "suspect_testigo_call",
        text: `El testigo ${nick} recibió una llamada minutos antes del cierre del acto 1.`,
      },
    },
  };

  room.scenes.finale!.description =
    "Antes del código ceremonial, el inspector pide que señaléis al culpable con las notas del cuaderno.";
  room.scenes.finale!.mood = "Sala de acusación: mapa de sospechosos y farol parpadeando.";

  const finalePuzzles = room.scenes.finale!.puzzles ?? [];
  if (!finalePuzzles.includes("case_accusation")) {
    const withoutOptional = finalePuzzles.filter((id) => id !== "voice_seal" && id !== "final_code");
    room.scenes.finale!.puzzles = [...withoutOptional, "case_accusation"];
  }

  room.puzzles.case_accusation = {
    id: "case_accusation",
    type: "deduction",
    label: "Sala de acusación",
    prompt: "Señala al culpable según las pistas del cuaderno (una sola acusación).",
    answer: culpritId,
    normalize: "lowercase",
    deduction: {
      suspects,
      requiredClueIds: WHODUNIT_REQUIRED_CLUES,
    },
    interactionHints: [
      "Cada sospechoso tiene rasgos que se activan cuando la pista correspondiente está en Notas.",
      "Solo podrás acusar cuando tengas las tres pruebas del acto 1–2.",
    ],
    maxHints: 2,
    hints: [
      { level: 1, text: "Descarta a quien tenga coartada verificada en dos rasgos." },
      { level: 2, text: `El inspector apunta a alguien del club o del faro — no a ${nick} si las notas cuadran.` },
    ],
  };

  room.winCondition = { type: "puzzle_solved", puzzleId: "case_accusation" };

  const culpritName = suspects.find((s) => s.id === culpritId)?.name ?? culpritId;
  room.beats = [
    ...(room.beats ?? []),
    {
      id: "gen-accusation",
      after: "scene_entered",
      sceneId: "finale",
      text: `Reunid las notas antes de señalar. El veredicto debe nombrar a una sola persona — el cuaderno apunta hacia ${culpritName.split("(")[0]?.trim() ?? "un sospechoso"}.`,
      branch: "default",
    },
  ];
}