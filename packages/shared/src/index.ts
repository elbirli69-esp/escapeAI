import type { AdventureType } from "./events.js";
import type { VoiceMatchMode } from "./answer-match.js";

export type GameStatus = "playing" | "won" | "lost";

export type GameActionType =
  | "submit_answer"
  | "submit_location"
  | "move"
  | "request_hint"
  | "take_item"
  | "use_item"
  | "complete_interaction";

export type InteractionStep = "listen" | "speak" | "capture" | "view" | "arrive";

export type LocationMode = "reach" | "quiz";
/** waypoint = rally a coordenadas; area_context = zona urbana para preguntas del entorno (no navegación interior). */
export type LocationIntent = "waypoint" | "area_context";

export type CompleteInteractionAction = {
  type: "complete_interaction";
  puzzleId: string;
  step: InteractionStep;
};

export type SubmitAnswerAction = {
  type: "submit_answer";
  puzzleId: string;
  value: string;
};

export type SubmitLocationAction = {
  type: "submit_location";
  puzzleId: string;
  lat: number;
  lon: number;
  accuracyMeters?: number;
};

export type MoveAction = {
  type: "move";
  sceneId: string;
};

export type RequestHintAction = {
  type: "request_hint";
  puzzleId: string;
};

export type TakeItemAction = {
  type: "take_item";
  itemId: string;
};

export type UseItemAction = {
  type: "use_item";
  itemId: string;
  puzzleId?: string;
};

export type GameAction =
  | SubmitAnswerAction
  | SubmitLocationAction
  | MoveAction
  | RequestHintAction
  | TakeItemAction
  | UseItemAction
  | CompleteInteractionAction;

export type PublicPuzzleType =
  | "code"
  | "inventory"
  | "sound"
  | "voice"
  | "camera"
  | "visual"
  | "location";

export type PublicItem = {
  id: string;
  name: string;
  description?: string;
  /** Miniatura opcional (p. ej. /media/item.jpg). */
  imageUrl?: string;
};

export type SoundMode = "url" | "beeps" | "tts";
export type CameraMode = "keyword" | "count" | "ocr_hint" | "qr_scan";
export type VisualLayout = "single" | "dual";

export type PublicPuzzle = {
  id: string;
  label?: string;
  cardImage?: string;
  prompt: string;
  puzzleType: PublicPuzzleType;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  maxHints: number;
  completedSteps: InteractionStep[];
  audioUrl?: string;
  soundMode?: SoundMode;
  ttsText?: string;
  beepPattern?: number[];
  minListenSec?: number;
  visualUrl?: string;
  pexelsQuery?: string;
  pexelsQueryB?: string;
  visualLayout?: VisualLayout;
  falPrompt?: string;
  cameraPrompt?: string;
  cameraMode?: CameraMode;
  cameraSynonyms?: string[];
  /** Pista cliente: categoría objetivo para comprobación visual (no sustituye la respuesta). */
  cameraExpectedCategory?: import("./scanner.js").EscapeObjectCategory;
  /** Pista cliente: categoría a contar en la imagen. */
  cameraCountCategory?: import("./scanner.js").EscapeObjectCategory;
  /** Permite botón «Confirmo que estoy en el lugar» si el detector falla. */
  allowCameraManualConfirm?: boolean;
  voiceLocale?: string;
  voiceMatchMode?: VoiceMatchMode;
  allowTextFallback?: boolean;
  /** Permite botón de reconocimiento offline (Vosk) además de Web Speech. */
  voiceOffline?: boolean;
  /** URL del modelo Vosk (.tar.gz); opcional. */
  voskModelUrl?: string;
  /** Idiomas Tesseract (p. ej. spa+eng). */
  ocrLang?: string;
  interactionHints?: string[];
  locationMode?: LocationMode;
  /** waypoint = llegar a un punto; area_context = confirmar zona urbana para quiz del entorno. */
  locationIntent?: LocationIntent;
  targetLat?: number;
  targetLon?: number;
  radiusMeters?: number;
  maxAccuracyMeters?: number;
  waypointLabel?: string;
  quizPrompt?: string;
};

export type PublicExit = {
  toSceneId: string;
  label: string;
  available: boolean;
};

export type PublicState = {
  sessionId: string;
  roomId: string;
  roomName: string;
  /** Nombre mostrado del jugador en sesiones de evento. */
  playerDisplayName?: string;
  eventJoinCode?: string;
  status: GameStatus;
  currentSceneId: string;
  sceneTitle: string;
  sceneDescription: string;
  sceneImageUrl?: string;
  sceneMood?: string;
  /** Orden de escenas para barra de progreso. */
  sceneOrder?: string[];
  roomTheme?: string;
  roomCoverImage?: string;
  narrative: string[];
  puzzles: PublicPuzzle[];
  exits: PublicExit[];
  inventory: string[];
  sceneItems: string[];
  inventoryItems?: PublicItem[];
  sceneItemItems?: PublicItem[];
  elapsedSec: number;
  timeLimitSec: number;
  timeRemainingSec: number;
  /** Recinto multi-habitación: mapa y estancia activa (solo lectura en cliente). */
  spatialSiteMap?: import("./spatial-site-public.js").SpatialSiteMapPublic;
  /** Texto «Estás en: …» cuando la escena es una habitación del recinto. */
  spatialRoomLabel?: string;
};

export type GameEvent =
  | { type: "puzzle_solved"; puzzleId: string }
  | { type: "puzzle_failed"; puzzleId: string; attempts: number }
  | { type: "scene_entered"; sceneId: string }
  | { type: "hint_requested"; puzzleId: string; level: number }
  | { type: "game_won" }
  | { type: "game_lost" };

export type ApplyResult = {
  ok: boolean;
  error?: string;
  state: PublicState;
  events: GameEvent[];
  /** @deprecated Usar gmInterventions / intervention */
  orchestrator?: OrchestratorResponse;
  /** Nuevas intervenciones generadas en esta petición */
  interventions?: import("./gamemaster.js").NarrativeIntervention[];
  /** Historial GM actualizado (para recarga / timeline) */
  gmInterventions?: import("./gamemaster.js").NarrativeIntervention[];
};

export type SessionViewResponse = {
  state: PublicState;
  gmInterventions: import("./gamemaster.js").NarrativeIntervention[];
};

export type OrchestratorResponse = {
  message: string;
  source: "fallback" | "openai" | "deepseek";
};

export type AiPuzzleContext = {
  id: string;
  prompt: string;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  lastSubmittedValue?: string;
};

export type AiContext = {
  sessionId: string;
  roomName: string;
  playerDisplayName?: string;
  eventTitle?: string;
  adventureType?: AdventureType;
  sceneTitle: string;
  sceneDescription: string;
  status: GameStatus;
  puzzles: AiPuzzleContext[];
  inventory: string[];
  timeRemainingSec: number;
  recentNarrative: string[];
};

export * from "./events.js";
export type {
  GmProcessTrigger,
  GmTriggerType,
  GmViewContext,
  NarrativeChannel,
  NarrativeClueRef,
  NarrativeIntervention,
  NarrativeInterventionMeta,
  NarrativePresentation,
  NarrativeSpoilerLevel,
} from "./gamemaster.js";
export {
  matchPlayerAnswer,
  normalizeAnswerText,
  spanishSpokenToDigits,
  stripDiacritics,
  type MatchAnswerOptions,
  type NormalizeMode,
  type VoiceMatchMode,
} from "./answer-match.js";
export type {
  DetectedObject,
  EnvironmentConstraints,
  EnvironmentType,
  EscapeObjectCategory,
  RelativePosition,
  RoomZone,
  SaveScannedEnvironmentRequest,
  ScanMetadata,
  ScannedEnvironment,
  ScannedEnvironmentSummary,
} from "./scanner.js";
export {
  defaultEnvironmentConstraints,
  ENVIRONMENT_TYPES,
  OBJECT_CATEGORIES,
  SCANNER_DETECTOR_ID,
} from "./scanner.js";
export { sanitizeScannedEnvironmentInput, toScannedEnvironmentSummary } from "./scanner-sanitize.js";
export type { SanitizeScannerResult } from "./scanner-sanitize.js";
export {
  bboxToZone,
  defaultLabelForCategory,
  mapCocoLabelToCategory,
  type RawDetection,
} from "./scanner-taxonomy.js";
export { categoryDisplayName, fuseDetectionsIntoObjects, mergeObjectLists } from "./scanner-fusion.js";
export { mapCameraError, mapDetectorLoadError, type ScannerCapability } from "./scanner-errors.js";
export {
  buildCountHint,
  buildObjectCheckHint,
  buildQrHint,
  countCategory,
  summarizeDetections,
  type CameraCaptureHint,
  type CameraCaptureHintKind,
} from "./camera-hint.js";
export type {
  ClueOutputType,
  CreateSpatialEventRequest,
  CreateSpatialSiteEventRequest,
  PuzzleClueSpec,
  SiteProposalsResponse,
  SpatialAdventureProposal,
  SpatialArchetype,
  SpatialDifficulty,
  SpatialMechanicId,
  SpatialPrepItem,
  SpatialPrepKind,
  SpatialProposalsResponse,
  SpatialPuzzlePlan,
} from "./spatial-adventure.js";
export type {
  SaveScannedSiteRequest,
  ScannedSite,
  ScannedSiteSummary,
  SiteGeoContext,
  SiteLink,
  SiteLinkKind,
  SiteMapLayout,
} from "./scanned-site.js";
export { DEFAULT_SITE_AREA_RADIUS_METERS } from "./scanned-site.js";
export type { SpatialSiteMapPublic, SpatialSiteVisitStep } from "./spatial-site-public.js";
export type { SanitizeSiteResult } from "./scanned-site-sanitize.js";
export { sanitizeScannedSiteInput, toScannedSiteSummary } from "./scanned-site-sanitize.js";
export {
  buildAreaQuizPrompt,
  buildCityQuizQuestion,
  buildNearbyCuriosityQuestion,
  buildNeighborhoodQuizQuestion,
  deriveCityQuizAnswer,
  deriveNearbyKeyword,
  deriveNeighborhoodQuizAnswer,
  hasGeoAnchor,
  normalizeGeoToken,
  resolveSiteAreaRadius,
} from "./geo-context.js";
export {
  haversineDistanceMeters,
  isValidGeoCoordinates,
  validatePlayerAtTarget,
  type LocationCoords,
  type ValidateLocationOptions,
  type ValidateLocationResult,
} from "./geo.js";
