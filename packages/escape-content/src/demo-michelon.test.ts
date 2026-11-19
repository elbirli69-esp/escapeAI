import { describe, expect, it } from "vitest";
import { loadRoomById, PUBLIC_DEMO_ROOM_ID } from "./index.js";

describe("demo-michelon", () => {
  it("es sala corta pública con 3 puzzles y 20 min", () => {
    const room = loadRoomById(PUBLIC_DEMO_ROOM_ID);
    expect(room.timeLimitSec).toBe(1200);
    expect(Object.keys(room.scenes)).toHaveLength(2);
    expect(Object.keys(room.puzzles)).toHaveLength(3);
    expect(room.winCondition).toEqual({ type: "puzzle_solved", puzzleId: "toast_seal" });
  });
});