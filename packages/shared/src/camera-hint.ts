import type { EscapeObjectCategory } from "./scanner.js";
import type { RawDetection } from "./scanner-taxonomy.js";
import { mapCocoLabelToCategory } from "./scanner-taxonomy.js";

export type CameraCaptureHintKind = "none" | "object" | "count" | "ocr" | "qr";

export type CameraCaptureHint = {
  kind: CameraCaptureHintKind;
  message: string;
  matched: boolean;
  detectedCount?: number;
  categoriesFound: EscapeObjectCategory[];
  qrPreview?: string;
};

export function summarizeDetections(detections: RawDetection[]): EscapeObjectCategory[] {
  const MIN = 0.35;
  const out: EscapeObjectCategory[] = [];
  for (const d of detections) {
    if (d.score < MIN) continue;
    out.push(mapCocoLabelToCategory(d.className));
  }
  return out;
}

export function countCategory(categories: EscapeObjectCategory[], target: EscapeObjectCategory): number {
  return categories.filter((c) => c === target).length;
}

export function buildObjectCheckHint(
  detections: RawDetection[],
  expected: EscapeObjectCategory,
): CameraCaptureHint {
  const categories = summarizeDetections(detections);
  const n = countCategory(categories, expected);
  const matched = n > 0;
  const labels = [...new Set(categories.filter((c) => c !== "unknown"))];
  if (matched) {
    return {
      kind: "object",
      matched: true,
      categoriesFound: categories,
      message: `Pista local: parece haber «${expected}» en la foto (${n} detección/es). Comprueba tú antes de enviar la respuesta.`,
    };
  }
  return {
    kind: "object",
    matched: false,
    categoriesFound: categories,
    message:
      labels.length > 0
        ? `No detectamos «${expected}» con confianza. Vemos: ${labels.join(", ")}. Puedes confirmar manualmente si lo tienes delante.`
        : `No detectamos «${expected}». Acerca la cámara o confirma manualmente que estás en el sitio correcto.`,
  };
}

export function buildCountHint(
  detections: RawDetection[],
  target: EscapeObjectCategory,
): CameraCaptureHint {
  const categories = summarizeDetections(detections);
  const n = countCategory(categories, target);
  return {
    kind: "count",
    matched: n > 0,
    detectedCount: n,
    categoriesFound: categories,
    message:
      n > 0
        ? `Pista local: contamos unas ${n} coincidencias con «${target}». Cuenta tú en la sala antes de enviar.`
        : `No pudimos contar «${target}» en esta foto. Haz otra toma o escribe el número si ya lo sabes.`,
  };
}

export function buildQrHint(decoded: string | null): CameraCaptureHint {
  if (!decoded?.trim()) {
    return {
      kind: "qr",
      matched: false,
      categoriesFound: [],
      message: "No se leyó ningún QR/código en la imagen. Enfoca la etiqueta o escribe el código a mano.",
    };
  }
  const preview = decoded.trim().slice(0, 48);
  return {
    kind: "qr",
    matched: true,
    categoriesFound: [],
    qrPreview: preview,
    message: `Pista local (QR/código): «${preview}». Verifica que coincide con la etiqueta física.`,
  };
}
