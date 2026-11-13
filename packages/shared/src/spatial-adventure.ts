import type { EscapeObjectCategory } from "./scanner.js";

export type SpatialMechanicId =
  | "CLOCK_OBSERVATION"
  | "BOOK_SEARCH"
  | "COLOR_SEQUENCE"
  | "OBJECT_COUNT"
  | "VISUAL_DETAIL"
  | "LOCATION_DISCOVERY"
  | "QR_CHECKIN"
  | "OCR_CLUE"
  | "AUDIO_LOCATION";

export type ClueOutputType = "digit" | "letter" | "word" | "location" | "sequence";

export type SpatialPrepKind = "existing_object" | "organizer_setup" | "digital_only";

export type SpatialPrepItem = {
  kind: SpatialPrepKind;
  text: string;
};

export type PuzzleClueSpec = {
  clueId: string;
  outputType: ClueOutputType;
  requiredClues?: string[];
  validationRule?: "exact" | "includes" | "ordered_sequence";
};

export type SpatialPuzzlePlan = {
  puzzleId: string;
  mechanicId: SpatialMechanicId;
  label: string;
  objectCategories: EscapeObjectCategory[];
  usesExistingObject: boolean;
  clueOutput?: PuzzleClueSpec;
  requiredClues?: string[];
  prep?: SpatialPrepItem[];
};

export type SpatialArchetype = "temporal" | "inventory_hunt" | "visual_trace";

export type SpatialDifficulty = "easy" | "medium" | "hard";

export type SpatialAdventureProposal = {
  id: string;
  archetype: SpatialArchetype;
  title: string;
  premise: string;
  mystery: string;
  durationMin: 30 | 45 | 60;
  puzzleCount: number;
  difficulty: SpatialDifficulty;
  objectsUsed: string[];
  sensoryMechanics: SpatialMechanicId[];
  prepChecklist: SpatialPrepItem[];
  endingDescription: string;
  puzzles: SpatialPuzzlePlan[];
};

export type SpatialProposalsResponse = {
  scannedEnvironmentId: string;
  inventoryVersion: number;
  proposals: SpatialAdventureProposal[];
};

export type CreateSpatialEventRequest = {
  proposalId: string;
  teamCount?: number;
  durationMin?: 30 | 45 | 60;
  eventTitle?: string;
  subject?: { name: string; nickname?: string };
  teamVariable?: import("./events.js").CreateEventRequest["teamVariable"];
  playSeed?: string;
};

export type SiteProposalsResponse = {
  scannedSiteId: string;
  siteVersion: number;
  roomInventoryVersions: Record<string, number>;
  proposals: SpatialAdventureProposal[];
};

export type CreateSpatialSiteEventRequest = CreateSpatialEventRequest;
