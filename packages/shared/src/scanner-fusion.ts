import type { DetectedObject, EscapeObjectCategory, RelativePosition } from "./scanner.js";

function newObjectId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
import { bboxToZone, defaultLabelForCategory, mapCocoLabelToCategory, type RawDetection } from "./scanner-taxonomy.js";

const MIN_SCORE = 0.35;

export function fuseDetectionsIntoObjects(
  batches: Array<{
    captureId: string;
    detections: RawDetection[];
  }>,
): DetectedObject[] {
  const byKey = new Map<string, DetectedObject & { scores: number[] }>();

  for (const batch of batches) {
    for (const det of batch.detections) {
      if (det.score < MIN_SCORE) continue;
      const category = mapCocoLabelToCategory(det.className);
      const zone = bboxToZone(det.bbox);
      const key = `${category}::${zone}`;
      const existing = byKey.get(key);
      const relativePosition: RelativePosition = { zone, x: det.bbox[0], y: det.bbox[1] };
      if (existing) {
        existing.quantity += 1;
        existing.scores.push(det.score);
        existing.confidence = Math.max(existing.confidence, det.score);
        existing.sourceCaptureId = batch.captureId;
        existing.relativePosition = relativePosition;
      } else {
        byKey.set(key, {
          id: newObjectId(),
          category,
          label: defaultLabelForCategory(category),
          quantity: 1,
          confidence: det.score,
          confirmed: false,
          interactable: category !== "unknown",
          movable: false,
          canHideClue: ["book", "plant", "decoration", "clock"].includes(category),
          restricted: category === "unknown",
          sourceCaptureId: batch.captureId,
          relativePosition,
          scores: [det.score],
        });
      }
    }
  }

  return [...byKey.values()].map(({ scores: _s, ...rest }) => rest);
}

export function mergeObjectLists(existing: DetectedObject[], incoming: DetectedObject[]): DetectedObject[] {
  const out = [...existing];
  for (const obj of incoming) {
    const dup = out.find(
      (e) => e.category === obj.category && e.relativePosition?.zone === obj.relativePosition?.zone,
    );
    if (dup) {
      dup.quantity = Math.max(dup.quantity, obj.quantity);
      dup.confidence = Math.max(dup.confidence, obj.confidence);
    } else {
      out.push({ ...obj, id: obj.id || newObjectId() });
    }
  }
  return out;
}

export function categoryDisplayName(category: EscapeObjectCategory): string {
  return defaultLabelForCategory(category);
}
