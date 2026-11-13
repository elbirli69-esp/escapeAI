export type Condition =
  | { type: "puzzle_solved"; puzzleId: string }
  | { type: "has_item"; itemId: string }
  | { type: "has_clue"; clueId: string }
  | { type: "team_progress_gte"; min: number };

export type PuzzleType =
  | "code"
  | "inventory"
  | "sound"
  | "voice"
  | "camera"
  | "visual"
  | "location";

export type RoomPuzzle = {
  id: string;
  type: PuzzleType;
  /** Título corto en la UI (si no, se usa id). */
  label?: string;
  /** Imagen de carta instructiva (p. ej. /media/lab-sound.jpg). */
  cardImage?: string;
  prompt: string;
  answer?: string;
  requiresItem?: string;
  normalize?: "uppercase" | "lowercase" | "trim";
  maxHints?: number;
  hints?: Array<{ level: number; text: string }>;
  /** URL de audio (sound). */
  audioUrl?: string;
  soundMode?: "url" | "beeps" | "tts";
  /** Texto leído en el dispositivo (`soundMode: tts`). */
  ttsText?: string;
  /** Duración on/off en ms para `soundMode: beeps`. */
  beepPattern?: number[];
  minListenSec?: number;
  /** Búsqueda Pexels si no hay visualUrl (visual). */
  pexelsQuery?: string;
  visualUrl?: string;
  /** Prompt fal.ai opcional (visual); se resuelve en cliente/API al jugar. */
  falPrompt?: string;
  /** Instrucción de búsqueda en el entorno real (camera). */
  cameraPrompt?: string;
  cameraMode?: "keyword" | "count" | "ocr_hint" | "qr_scan";
  cameraSynonyms?: string[];
  cameraExpectedCategory?: import("@escapeai/shared").EscapeObjectCategory;
  cameraCountCategory?: import("@escapeai/shared").EscapeObjectCategory;
  allowCameraManualConfirm?: boolean;
  voiceLocale?: string;
  voiceMatchMode?: "exact" | "fuzzy" | "digits";
  allowTextFallback?: boolean;
  voiceOffline?: boolean;
  voskModelUrl?: string;
  ocrLang?: string;
  visualLayout?: "single" | "dual";
  pexelsQueryB?: string;
  interactionHints?: string[];
  /** Llegar al punto (`reach`) o quiz en el sitio (`quiz`). */
  locationMode?: "reach" | "quiz";
  /** `area_context` usa GPS solo para fijar ciudad/barrio y cuestiones del entorno, no waypoints interiores. */
  locationIntent?: "waypoint" | "area_context";
  targetLat?: number;
  targetLon?: number;
  radiusMeters?: number;
  maxAccuracyMeters?: number;
  waypointLabel?: string;
  /** Pregunta mostrada tras confirmar GPS en modo quiz. */
  quizPrompt?: string;
  /** Tras resolver: anota una pista jugable en el diario (sin exponer answers al cliente vía API dedicada). */
  onSolve?: { grantClue?: { id: string; text: string } };
};

export type RoomBeatAfter = "session_started" | "puzzle_solved" | "scene_entered";

export type RoomBeat = {
  id: string;
  after: RoomBeatAfter;
  puzzleId?: string;
  sceneId?: string;
  text: string;
};

export type RoomCharacter = {
  id: string;
  displayName: string;
  voiceTone?: string;
  backstoryPublic?: string;
  /** Hechos que el GM/LLM puede usar (nunca soluciones crudas). */
  authorizedKnowledge?: string[];
  forbiddenTopics?: string[];
  fallbackLines?: string[];
  greeting?: string;
  /** Lectura en voz alta de respuestas GM (Web Speech en cliente). */
  spokenReplies?: boolean;
  voiceLocale?: string;
};

export type RoomScene = {
  id: string;
  title: string;
  description: string;
  /** Ruta o URL de imagen de la escena (p. ej. /media/pilot-entrance.jpg). */
  image?: string;
  mood?: string;
  puzzles?: string[];
  items?: string[];
  characters?: string[];
  exits?: Array<{
    toSceneId: string;
    label: string;
    when: Condition;
  }>;
};

export type RoomItem = {
  name: string;
  description: string;
  image?: string;
};

export type RoomDefinition = {
  id: string;
  name: string;
  tagline?: string;
  coverImage?: string;
  theme?: "urban" | "coastal" | string;
  timeLimitSec: number;
  startSceneId: string;
  winCondition: Condition;
  items?: Record<string, RoomItem>;
  scenes: Record<string, RoomScene>;
  puzzles: Record<string, RoomPuzzle>;
  characters?: Record<string, RoomCharacter>;
  /** Mapa esquemático de recinto ScannerAI (partidas multi-habitación). */
  spatialSiteMap?: import("@escapeai/shared").SpatialSiteMapPublic;
  /** Momentos narrativos fijos del motor (sin LLM). */
  beats?: RoomBeat[];
};
