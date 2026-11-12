import type { RawDetection, ScannerCapability } from "@escapeai/shared";
import { mapDetectorLoadError, SCANNER_DETECTOR_ID } from "@escapeai/shared";

type CocoModel = {
  detect: (input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => Promise<
    Array<{ class: string; score: number; bbox: [number, number, number, number] }>
  >;
};

let modelPromise: Promise<CocoModel> | null = null;
let lastCapability: ScannerCapability | null = null;

export function getScannerCapability(): ScannerCapability {
  if (lastCapability) return lastCapability;
  if (typeof window === "undefined") {
    return { supported: false, reason: "Solo disponible en navegador." };
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (gl) {
      lastCapability = { supported: true, backend: "webgl" };
      return lastCapability;
    }
  } catch {
    /* fall through */
  }
  if (typeof WebAssembly !== "undefined") {
    lastCapability = { supported: true, backend: "wasm" };
    return lastCapability;
  }
  lastCapability = { supported: false, reason: "Este dispositivo no puede ejecutar el detector." };
  return lastCapability;
}

export async function loadObjectDetector(): Promise<CocoModel> {
  if (modelPromise) return modelPromise;
  const cap = getScannerCapability();
  if (!cap.supported) {
    throw new Error(cap.reason);
  }

  modelPromise = (async () => {
    try {
      const [cocoSsd, tf] = await Promise.all([
        import("@tensorflow-models/coco-ssd"),
        import("@tensorflow/tfjs-core"),
      ]);
      await import("@tensorflow/tfjs-backend-webgl");
      try {
        await import("@tensorflow/tfjs-backend-wasm");
      } catch {
        /* wasm optional */
      }
      await import("@tensorflow/tfjs-converter");

      const backend = cap.backend === "webgl" ? "webgl" : "wasm";
      try {
        await tf.setBackend(backend);
      } catch {
        await tf.setBackend("cpu");
      }
      await tf.ready();

      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      return {
        detect: async (input) => {
          const preds = await model.detect(input);
          return preds.map((p) => ({
            class: p.class,
            score: p.score,
            bbox: p.bbox as [number, number, number, number],
          }));
        },
      };
    } catch (err) {
      modelPromise = null;
      throw new Error(mapDetectorLoadError(err));
    }
  })();

  return modelPromise;
}

export async function detectOnCanvas(canvas: HTMLCanvasElement): Promise<RawDetection[]> {
  const model = await loadObjectDetector();
  const preds = await model.detect(canvas);
  return preds.map((p) => ({
    className: p.class,
    score: p.score,
    bbox: [
      p.bbox[0] / canvas.width,
      p.bbox[1] / canvas.height,
      p.bbox[2] / canvas.width,
      p.bbox[3] / canvas.height,
    ],
  }));
}

export function scannerDetectorId(): string {
  return SCANNER_DETECTOR_ID;
}
