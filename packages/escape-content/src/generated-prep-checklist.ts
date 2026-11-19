import type { SpatialPrepItem } from "@escapeai/shared";
import type { RoomDefinition, RoomPuzzle } from "@escapeai/escape-engine";

export type GeneratedHybridPlayMode = "room" | "mobile_only";

function finalePosterPuzzle(room: RoomDefinition): RoomPuzzle | undefined {
  return Object.values(room.puzzles).find((p) => p.id === "finale_poster" && p.cameraMode === "ocr_hint");
}

/** Checklist para organizador en eventos generados (P5-C). Sin spoilers de `answer`. */
export function buildGeneratedPrepChecklist(
  room: RoomDefinition,
  opts: { joinCode: string; hybridPlayMode?: GeneratedHybridPlayMode },
): SpatialPrepItem[] {
  const mode = opts.hybridPlayMode ?? "room";
  const items: SpatialPrepItem[] = [
    {
      kind: "digital_only",
      text: `Proyecta el QR o el código ${opts.joinCode} para que entren los equipos.`,
    },
  ];

  if (mode === "mobile_only") {
    items.push({
      kind: "digital_only",
      text: "Modo solo móvil: no hace falta colocar el recuerdo físico; el token es virtual en el inventario.",
    });
  } else if (room.items?.token) {
    items.push({
      kind: "organizer_setup",
      text: `Coloca en la mesa un recuerdo físico etiquetado como «${room.items.token.name}» antes del acto 2.`,
    });
  }

  const poster = finalePosterPuzzle(room);
  if (poster) {
    if (mode === "room") {
      items.push({
        kind: "organizer_setup",
        text:
          "Imprime un cartel A5 con la palabra clave del cierre (el panel del organizador indica el texto; no lo leas en voz alta).",
      });
    } else {
      items.push({
        kind: "digital_only",
        text: "Acto 3: muestra el cartel digital en pantalla o dicta el código de dos letras del cierre.",
      });
    }
  }

  if (mode === "room" && room.puzzles.camera_hunt) {
    items.push({
      kind: "organizer_setup",
      text: "Acto 2: deja el salón listo para una foto grupal (luz suficiente, objeto de recuerdo visible).",
    });
  }

  return items;
}

/** Texto corto del cartel (sin solución completa del evento). */
export function posterKeywordForOrganizer(room: RoomDefinition): string | undefined {
  const poster = finalePosterPuzzle(room);
  if (!poster?.answer) return undefined;
  return String(poster.answer).toUpperCase();
}

/** Cuenta estaciones híbridas de dos fases (P5-E). */
export function countHybridStations(room: RoomDefinition): number {
  let n = 0;
  for (const item of Object.values(room.items ?? {})) {
    if (item.takeRequiresPuzzleSolved) n++;
  }
  for (const puzzle of Object.values(room.puzzles)) {
    const hints = puzzle.interactionHints ?? [];
    if (hints.some((h) => h.startsWith("En la sala:")) && hints.some((h) => h.startsWith("En el móvil:"))) {
      n++;
    }
  }
  return n;
}