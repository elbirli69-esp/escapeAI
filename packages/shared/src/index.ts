import type { AdventureType } from "./events.js";
import type { VoiceMatchMode } from "./answer-match.js";

export type GameStatus = "playing" | "won" | "lost";

export type GameActionType =
  | "submit_answer"
  | "move"
  | "request_hint"
  | "take_item"
  | "use_item"
  | "complete_interaction";

export type InteractionStep = "listen" | "speak" | "capture" | "view";

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
  | "visual";

export type PublicItem = {
  id: string;
  name: string;
  description?: string;
};

export type SoundMode = "url" | "beeps" | "tts";
export type CameraMode = "keyword" | "count" | "ocr_hint";
export type VisualLayout = "single" | "dual";

export type PublicPuzzle = {
  id: string;
  label?: string;
  prompt: string;
  puzzleType: PublicPuzzleType;
  solved: boolean;
  attempts: number;
  hintsUsed: number;
  maxHints: number;
  completedSteps: InteractionStep[];
  audioUrl?: string;
  soundMode?: SoundMode;
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
  voiceLocale?: string;
  voiceMatchMode?: VoiceMatchMode;
  allowTextFallback?: boolean;
  interactionHints?: string[];
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
  orchestrator?: OrchestratorResponse;
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
export {
  matchPlayerAnswer,
  normalizeAnswerText,
  spanishSpokenToDigits,
  stripDiacritics,
  type MatchAnswerOptions,
  type NormalizeMode,
  type VoiceMatchMode,
} from "./answer-match.js";
