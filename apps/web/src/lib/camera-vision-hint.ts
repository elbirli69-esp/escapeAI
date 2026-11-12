import type { CameraCaptureHint, PublicPuzzle } from "@escapeai/shared";
import {
  buildCountHint,
  buildObjectCheckHint,
  buildQrHint,
} from "@escapeai/shared";
import { detectOnCanvas, getScannerCapability } from "../scanner/detector";
import { decodeQrFromDataUrl } from "./qr-from-image";

async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("decode"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.floor(img.naturalWidth * scale);
  canvas.height = Math.floor(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function analyzeCameraCapture(
  puzzle: PublicPuzzle,
  dataUrl: string,
): Promise<CameraCaptureHint | null> {
  const mode = puzzle.cameraMode ?? "keyword";

  if (mode === "qr_scan") {
    const decoded = await decodeQrFromDataUrl(dataUrl);
    return buildQrHint(decoded);
  }

  if (mode === "ocr_hint") {
    return null;
  }

  const cap = getScannerCapability();
  if (!cap.supported) {
    return {
      kind: mode === "count" ? "count" : "object",
      matched: false,
      categoriesFound: [],
      message: "Detección no disponible en este dispositivo. Usa la confirmación manual o escribe la respuesta.",
    };
  }

  try {
    const canvas = await dataUrlToCanvas(dataUrl);
    const detections = await detectOnCanvas(canvas);

    if (mode === "count" && puzzle.cameraCountCategory) {
      return buildCountHint(detections, puzzle.cameraCountCategory);
    }

    const expected =
      puzzle.cameraExpectedCategory ??
      (mode === "keyword" && puzzle.cameraSynonyms?.[0]
        ? undefined
        : undefined);

    if (expected) {
      return buildObjectCheckHint(detections, expected);
    }

    if (mode === "count" && puzzle.cameraCountCategory) {
      return buildCountHint(detections, puzzle.cameraCountCategory);
    }

    return {
      kind: "object",
      matched: detections.length > 0,
      categoriesFound: [],
      message:
        detections.length > 0
          ? "Pista local: hay objetos reconocibles en la foto. La respuesta final la valida el servidor."
          : "No detectamos objetos con claridad. Confirma manualmente o repite la foto.",
    };
  } catch {
    return {
      kind: "none",
      matched: false,
      categoriesFound: [],
      message: "No se pudo analizar la foto localmente. Puedes confirmar manualmente.",
    };
  }
}
