export type Condition =
  | { type: "puzzle_solved"; puzzleId: string }
  | { type: "has_item"; itemId: string };

export type PuzzleType = "code" | "inventory" | "sound" | "voice" | "camera" | "visual";

export type RoomPuzzle = {
  id: string;
  type: PuzzleType;
  /** Título corto en la UI (si no, se usa id). */
  label?: string;
  prompt: string;
  answer?: string;
  requiresItem?: string;
  normalize?: "uppercase" | "lowercase" | "trim";
  maxHints?: number;
  hints?: Array<{ level: number; text: string }>;
  /** URL de audio (sound). */
  audioUrl?: string;
  /** Búsqueda Pexels si no hay visualUrl (visual). */
  pexelsQuery?: string;
  visualUrl?: string;
  /** Prompt fal.ai opcional (visual); se resuelve en cliente/API al jugar. */
  falPrompt?: string;
  /** Instrucción de búsqueda en el entorno real (camera). */
  cameraPrompt?: string;
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
  exits?: Array<{
    toSceneId: string;
    label: string;
    when: Condition;
  }>;
};

export type RoomItem = {
  name: string;
  description: string;
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
};
