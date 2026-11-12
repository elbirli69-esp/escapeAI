export type EnvironmentType =
  | "living_room"
  | "bedroom"
  | "office"
  | "kitchen"
  | "single_room"
  | "exterior";

export type EscapeObjectCategory =
  | "door"
  | "window"
  | "table"
  | "chair"
  | "sofa"
  | "bookshelf"
  | "book"
  | "painting"
  | "clock"
  | "plant"
  | "lamp"
  | "tv"
  | "drawer"
  | "wardrobe"
  | "decoration"
  | "unknown";

export type RoomZone = "nw" | "n" | "ne" | "w" | "c" | "e" | "sw" | "s" | "se";

export type RelativePosition = {
  zone: RoomZone;
  x?: number;
  y?: number;
};

/** Solo cliente — no debe persistirse en API. */
export type DetectedObjectLocalFields = {
  sourceCaptureId?: string;
  relativePosition?: RelativePosition;
};

export type DetectedObject = DetectedObjectLocalFields & {
  id: string;
  category: EscapeObjectCategory;
  label?: string;
  quantity: number;
  confidence: number;
  confirmed: boolean;
  interactable: boolean;
  movable: boolean;
  canHideClue: boolean;
  restricted: boolean;
};

export type EnvironmentConstraints = {
  allowMovement: boolean;
  allowOpeningFurniture: boolean;
  allowMovingObjects: boolean;
  allowTouchingDevices: boolean;
  restrictedAreas?: string[];
  fragileObjectIds?: string[];
  organizerCanPlaceProps: boolean;
};

export type ScanMetadata = {
  captureCount: number;
  detectorId: string;
  completedAt?: string;
};

export type ScannedEnvironment = {
  id: string;
  name: string;
  environmentType: EnvironmentType;
  objects: DetectedObject[];
  constraints: EnvironmentConstraints;
  scanMetadata?: ScanMetadata;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SaveScannedEnvironmentRequest = Omit<
  ScannedEnvironment,
  "id" | "createdAt" | "updatedAt" | "version"
> & { id?: string };

export type ScannedEnvironmentSummary = {
  id: string;
  name: string;
  environmentType: EnvironmentType;
  objectCount: number;
  confirmedCount: number;
  updatedAt: string;
};

export const SCANNER_DETECTOR_ID = "coco-ssd-lite-mobilenet-v2";

export const ENVIRONMENT_TYPES: EnvironmentType[] = [
  "single_room",
  "living_room",
  "bedroom",
  "office",
  "kitchen",
  "exterior",
];

export const OBJECT_CATEGORIES: EscapeObjectCategory[] = [
  "door",
  "window",
  "table",
  "chair",
  "sofa",
  "bookshelf",
  "book",
  "painting",
  "clock",
  "plant",
  "lamp",
  "tv",
  "drawer",
  "wardrobe",
  "decoration",
  "unknown",
];

export function defaultEnvironmentConstraints(): EnvironmentConstraints {
  return {
    allowMovement: true,
    allowOpeningFurniture: false,
    allowMovingObjects: false,
    allowTouchingDevices: false,
    organizerCanPlaceProps: true,
  };
}
