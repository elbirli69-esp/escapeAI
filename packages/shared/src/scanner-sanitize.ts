import type { DetectedObject, EnvironmentType, SaveScannedEnvironmentRequest, ScannedEnvironment } from "./scanner.js";
import { defaultEnvironmentConstraints, ENVIRONMENT_TYPES, OBJECT_CATEGORIES, SCANNER_DETECTOR_ID } from "./scanner.js";

const FORBIDDEN_KEY_RE =
  /^(image|images|video|blob|dataUrl|dataURL|base64|screenshot|captureData|thumbnail|frame)$/i;

const BASE64_PAYLOAD_RE = /data:image\/|base64,/i;

export type SanitizeScannerResult =
  | { ok: true; body: SaveScannedEnvironmentRequest }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function findForbiddenKeys(value: unknown, path = ""): string | undefined {
  if (typeof value === "string" && BASE64_PAYLOAD_RE.test(value)) {
    return path || "root";
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findForbiddenKeys(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return undefined;
  }
  if (!isPlainObject(value)) return undefined;
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEY_RE.test(k)) return path ? `${path}.${k}` : k;
    const hit = findForbiddenKeys(v, path ? `${path}.${k}` : k);
    if (hit) return hit;
  }
  return undefined;
}

function stripLocalFields(obj: DetectedObject): Omit<DetectedObject, "sourceCaptureId" | "relativePosition"> {
  const {
    sourceCaptureId: _s,
    relativePosition: _r,
    id,
    category,
    label,
    quantity,
    confidence,
    confirmed,
    interactable,
    movable,
    canHideClue,
    restricted,
  } = obj;
  return {
    id,
    category,
    label,
    quantity,
    confidence,
    confirmed,
    interactable,
    movable,
    canHideClue,
    restricted,
  };
}

export function sanitizeScannedEnvironmentInput(raw: unknown): SanitizeScannerResult {
  const forbidden = findForbiddenKeys(raw);
  if (forbidden) {
    return { ok: false, error: "No se permiten imágenes ni vídeo en el inventario (privacidad ScannerAI)." };
  }
  if (!isPlainObject(raw)) return { ok: false, error: "Cuerpo inválido." };

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < 2) return { ok: false, error: "Indica un nombre para el espacio (mínimo 2 caracteres)." };

  const environmentType = raw.environmentType as EnvironmentType;
  if (!ENVIRONMENT_TYPES.includes(environmentType)) {
    return { ok: false, error: "Tipo de espacio no válido." };
  }

  if (!Array.isArray(raw.objects)) return { ok: false, error: "Falta la lista de objetos." };

  const objects: DetectedObject[] = [];
  for (const row of raw.objects) {
    if (!isPlainObject(row)) return { ok: false, error: "Objeto inválido en el inventario." };
    const category = row.category as DetectedObject["category"];
    if (!OBJECT_CATEGORIES.includes(category)) {
      return { ok: false, error: `Categoría no válida: ${String(row.category)}` };
    }
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id) return { ok: false, error: "Cada objeto necesita un id." };
    const quantity = Math.max(1, Math.min(99, Math.floor(Number(row.quantity) || 1)));
    const confidence = Math.max(0, Math.min(1, Number(row.confidence) || 0));
    objects.push({
      id,
      category,
      label: typeof row.label === "string" ? row.label.trim().slice(0, 120) : undefined,
      quantity,
      confidence,
      confirmed: Boolean(row.confirmed),
      interactable: row.interactable !== false,
      movable: Boolean(row.movable),
      canHideClue: Boolean(row.canHideClue),
      restricted: Boolean(row.restricted),
    });
  }

  const confirmed = objects.filter((o) => o.confirmed);
  if (confirmed.length < 1) {
    return { ok: false, error: "Confirma al menos un objeto antes de guardar." };
  }

  const constraintsIn = isPlainObject(raw.constraints) ? raw.constraints : {};
  const constraints = {
    ...defaultEnvironmentConstraints(),
    allowMovement: constraintsIn.allowMovement !== false,
    allowOpeningFurniture: Boolean(constraintsIn.allowOpeningFurniture),
    allowMovingObjects: Boolean(constraintsIn.allowMovingObjects),
    allowTouchingDevices: Boolean(constraintsIn.allowTouchingDevices),
    organizerCanPlaceProps: constraintsIn.organizerCanPlaceProps !== false,
    restrictedAreas: Array.isArray(constraintsIn.restrictedAreas)
      ? constraintsIn.restrictedAreas.map((s) => String(s).slice(0, 80)).slice(0, 20)
      : undefined,
    fragileObjectIds: Array.isArray(constraintsIn.fragileObjectIds)
      ? constraintsIn.fragileObjectIds.map((s) => String(s)).slice(0, 50)
      : undefined,
  };

  let scanMetadata: ScannedEnvironment["scanMetadata"];
  if (isPlainObject(raw.scanMetadata)) {
    scanMetadata = {
      captureCount: Math.max(0, Math.floor(Number(raw.scanMetadata.captureCount) || 0)),
      detectorId:
        typeof raw.scanMetadata.detectorId === "string"
          ? raw.scanMetadata.detectorId.slice(0, 64)
          : SCANNER_DETECTOR_ID,
      completedAt:
        typeof raw.scanMetadata.completedAt === "string"
          ? raw.scanMetadata.completedAt
          : undefined,
    };
  }

  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : undefined;

  return {
    ok: true,
    body: {
      id,
      name,
      environmentType,
      objects: objects.map((o) => stripLocalFields(o) as DetectedObject),
      constraints,
      scanMetadata,
    },
  };
}

export function toScannedEnvironmentSummary(env: ScannedEnvironment) {
  const confirmedCount = env.objects.filter((o) => o.confirmed).length;
  return {
    id: env.id,
    name: env.name,
    environmentType: env.environmentType,
    objectCount: env.objects.length,
    confirmedCount,
    updatedAt: env.updatedAt,
  };
}
