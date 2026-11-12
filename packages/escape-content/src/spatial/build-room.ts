import type { ScannedEnvironment, SpatialAdventureProposal } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";
import { durationMinToSec } from "@escapeai/shared";
import {
  deriveBookKeyword,
  deriveClockDigits,
  deriveColorSequence,
  deriveCountAnswer,
  deriveFinalCode,
  deriveOcrDigit,
  derivePlantKeyword,
  deriveQrAnswer,
  deriveVisualCount,
} from "./derive-answers.js";

export function buildSpatialRoom(
  env: ScannedEnvironment,
  proposal: SpatialAdventureProposal,
  eventId: string,
): RoomDefinition {
  const roomId = `spatial-${eventId.slice(0, 8)}`;
  const clockHour = deriveClockDigits(env, proposal.id);
  const bookWord = deriveBookKeyword(env);
  const chairCount = deriveCountAnswer(env, "chair");
  const plantWord = derivePlantKeyword(env);
  const ocrDigit = deriveOcrDigit(env, proposal.id);
  const colors = deriveColorSequence(env, proposal.id);
  const qrAnswer = deriveQrAnswer(proposal.id);
  const visualN = deriveVisualCount(env, "painting");
  const finalDigits = deriveFinalCode([clockHour, ocrDigit], "digits");

  const base = {
    id: roomId,
    name: proposal.title,
    tagline: proposal.premise,
    coverImage: "/media/pilot-cover.jpg",
    theme: "urban" as const,
    timeLimitSec: durationMinToSec(proposal.durationMin),
    startSceneId: "explore",
    winCondition: { type: "puzzle_solved" as const, puzzleId: "spatial_finale" },
    scenes: {
      explore: {
        id: "explore",
        title: env.name,
        description: proposal.premise,
        image: "/media/pilot-entrance.jpg",
        mood: `Explora ${env.name} y usa los objetos reales que confirmaste al escanear.`,
        puzzles: [] as string[],
        exits: [
          {
            toSceneId: "climax",
            label: "Avanzar",
            when: { type: "puzzle_solved" as const, puzzleId: "spatial_bridge" },
          },
        ],
      },
      climax: {
        id: "climax",
        title: "Cierre",
        description: proposal.mystery,
        image: "/media/pilot-control.jpg",
        mood: proposal.endingDescription,
        puzzles: ["spatial_finale"],
        exits: [],
      },
    },
    puzzles: {} as RoomDefinition["puzzles"],
    items: {
      spatial_token: {
        name: `Ficha de ${env.name}`,
        description: "Recuerda del escaneo del organizador.",
      },
    },
  };

  const puzzles = base.puzzles;

  if (proposal.archetype === "temporal") {
    base.scenes.explore.puzzles = ["spatial_clock", "spatial_book", "spatial_bridge"];
    puzzles.spatial_clock = {
      id: "spatial_clock",
      type: "camera",
      label: "Hora del reloj",
      cameraPrompt: "Fotografía el reloj de la habitación. Observa la hora.",
      cameraMode: "keyword",
      cameraExpectedCategory: "clock",
      allowCameraManualConfirm: true,
      cameraSynonyms: ["reloj", "hora"],
      prompt: `Escribe las dos primeras cifras de la hora que viste (relacionado con ${clockHour}).`,
      answer: clockHour,
      normalize: "trim",
      interactionHints: [`El organizador pudo fijar el reloj en ${clockHour}:00 antes de jugar.`],
    };
    puzzles.spatial_book = {
      id: "spatial_book",
      type: "camera",
      label: "Libro en la estantería",
      cameraPrompt: "Haz una foto de la estantería o del libro señalado.",
      cameraMode: "keyword",
      cameraExpectedCategory: "book",
      allowCameraManualConfirm: true,
      prompt: `Tras la foto, escribe la palabra clave «${bookWord}».`,
      answer: bookWord,
      normalize: "uppercase",
    };
    puzzles.spatial_bridge = {
      id: "spatial_bridge",
      type: "code",
      label: "Combinar pistas",
      prompt: "Une la cifra del reloj y el dígito del libro (pista: segundo carácter del apodo del lugar).",
      answer: finalDigits,
      normalize: "trim",
    };
    puzzles.spatial_finale = {
      id: "spatial_finale",
      type: "code",
      label: "Salida",
      prompt: proposal.endingDescription,
      answer: finalDigits,
      normalize: "trim",
    };
  } else if (proposal.archetype === "inventory_hunt") {
    base.scenes.explore.puzzles = ["spatial_count", "spatial_plant", "spatial_bridge"];
    puzzles.spatial_count = {
      id: "spatial_count",
      type: "code",
      label: "Conteo de sillas",
      prompt: "Cuenta las sillas confirmadas en el inventario del escaneo.",
      answer: chairCount,
      normalize: "trim",
    };
    puzzles.spatial_plant = {
      id: "spatial_plant",
      type: "camera",
      label: "Buscar la planta",
      cameraPrompt: "Fotografía la planta del espacio.",
      cameraMode: "keyword",
      cameraExpectedCategory: "plant",
      allowCameraManualConfirm: true,
      cameraSynonyms: ["planta", plantWord.toLowerCase()],
      prompt: `Escribe el nombre de la planta o la palabra «${plantWord}».`,
      answer: plantWord,
      normalize: "uppercase",
    };
    puzzles.spatial_bridge = {
      id: "spatial_bridge",
      type: "sound",
      label: "Mensaje",
      soundMode: "tts",
      ttsText: `Ve a la zona de la planta y di en voz alta: ${plantWord}.`,
      prompt: "Di la palabra de la planta en voz alta (puedes escribirla).",
      answer: plantWord.toLowerCase(),
      normalize: "lowercase",
      voiceMatchMode: "fuzzy",
      allowTextFallback: true,
    };
    puzzles.spatial_finale = {
      id: "spatial_finale",
      type: "code",
      label: "Cierre",
      prompt: proposal.endingDescription,
      answer: chairCount + plantWord.slice(0, 1),
      normalize: "trim",
    };
  } else {
    base.scenes.explore.puzzles = ["spatial_visual", "spatial_ocr", "spatial_color", "spatial_bridge"];
    puzzles.spatial_visual = {
      id: "spatial_visual",
      type: "visual",
      label: "Cuadros y decoración",
      prompt: "Observa las piezas visuales. ¿Cuántas hay en el inventario?",
      pexelsQuery: `${env.name} living room art`,
      answer: visualN,
      normalize: "trim",
    };
    puzzles.spatial_ocr = {
      id: "spatial_ocr",
      type: "camera",
      label: "Texto impreso",
      cameraMode: "ocr_hint",
      cameraPrompt: "Fotografía el cartel o etiqueta con número.",
      ocrLang: "spa+eng",
      prompt: `Escribe el dígito principal del texto (pista local OCR).`,
      answer: ocrDigit,
      normalize: "trim",
    };
    puzzles.spatial_color = {
      id: "spatial_color",
      type: "code",
      label: "Secuencia de colores",
      prompt: `Orden de colores en objetos (1=verde 2=rojo 3=azul): ${colors}`,
      answer: colors,
      normalize: "trim",
    };
    puzzles.spatial_bridge = {
      id: "spatial_bridge",
      type: "camera",
      label: "Check-in QR",
      cameraMode: "qr_scan",
      allowCameraManualConfirm: true,
      cameraPrompt: "Fotografía la etiqueta o QR que colocó el organizador.",
      prompt: `Escribe el código de la etiqueta (organizador: «${qrAnswer}»).`,
      answer: qrAnswer,
      normalize: "uppercase",
    };
    puzzles.spatial_finale = {
      id: "spatial_finale",
      type: "code",
      label: "Salida",
      prompt: proposal.endingDescription,
      answer: deriveFinalCode([ocrDigit, colors], "digits"),
      normalize: "trim",
    };
  }

  return base;
}
