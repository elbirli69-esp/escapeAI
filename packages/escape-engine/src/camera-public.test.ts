import { describe, expect, it } from "vitest";
import { createSession, toPublicState } from "./session.js";
import type { RoomDefinition } from "./room-definition.js";

const miniRoom: RoomDefinition = {
  id: "cam-test",
  name: "Cam",
  timeLimitSec: 600,
  startSceneId: "s1",
  winCondition: { type: "puzzle_solved", puzzleId: "p1" },
  scenes: {
    s1: {
      id: "s1",
      title: "S",
      description: "d",
      puzzles: ["p1"],
      exits: [],
    },
  },
  puzzles: {
    p1: {
      id: "p1",
      type: "camera",
      prompt: "x",
      answer: "OK",
      cameraMode: "qr_scan",
      cameraExpectedCategory: "plant",
      cameraCountCategory: "chair",
      allowCameraManualConfirm: true,
    },
  },
};

describe("camera public fields", () => {
  it("expone campos de comprobación visual sin secretos", () => {
    const session = createSession(miniRoom);
    const pub = toPublicState(session);
    const p = pub.puzzles[0]!;
    expect(p.cameraMode).toBe("qr_scan");
    expect(p.cameraExpectedCategory).toBe("plant");
    expect(p.cameraCountCategory).toBe("chair");
    expect(p.allowCameraManualConfirm).toBe(true);
    expect(p).not.toHaveProperty("answer");
  });
});
