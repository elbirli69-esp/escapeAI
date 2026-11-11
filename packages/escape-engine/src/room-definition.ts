export type Condition =
  | { type: "puzzle_solved"; puzzleId: string }
  | { type: "has_item"; itemId: string };

export type PuzzleType = "code" | "inventory";

export type RoomPuzzle = {
  id: string;
  type: PuzzleType;
  prompt: string;
  answer?: string;
  requiresItem?: string;
  normalize?: "uppercase" | "lowercase" | "trim";
  maxHints?: number;
  hints?: Array<{ level: number; text: string }>;
};

export type RoomScene = {
  id: string;
  title: string;
  description: string;
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
  timeLimitSec: number;
  startSceneId: string;
  winCondition: Condition;
  items?: Record<string, RoomItem>;
  scenes: Record<string, RoomScene>;
  puzzles: Record<string, RoomPuzzle>;
};
