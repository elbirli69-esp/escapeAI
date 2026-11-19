export type {
  Condition,
  DeductionSuspect,
  DeductionTrait,
  PuzzleType,
  RoomBeat,
  RoomCharacter,
  RoomDefinition,
  RoomPuzzle,
  RoomScene,
} from "./room-definition.js";
export { loadRoomFromFile, parseRoomDefinition } from "./load-room.js";
export {
  applyAction,
  createSession,
  getExitAvailability,
  sessionHasClue,
  toAiContext,
  toPublicState,
  type SessionRecord,
} from "./session.js";
export {
  activateCompressNarrative,
  grantBonusHintLevel,
  isGeneratedEventSession,
  maybeGeneratedFailForward,
  effectiveHintCap,
} from "./adaptive-assist.js";
export {
  deserializeSession,
  serializeSession,
  type SerializedSession,
} from "./session-serialize.js";
export type { PlayerContext } from "./player-context.js";
