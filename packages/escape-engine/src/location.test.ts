import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const roomYaml = `
id: geo
name: Geo
timeLimitSec: 600
startSceneId: s
winCondition: { type: puzzle_solved, puzzleId: quiz1 }
items: {}
scenes:
  s:
    id: s
    title: S
    description: d
    puzzles: [reach1, quiz1]
puzzles:
  reach1:
    id: reach1
    type: location
    locationMode: reach
    prompt: Llega
    targetLat: 40.4169
    targetLon: -3.7035
    radiusMeters: 60
  quiz1:
    id: quiz1
    type: location
    locationMode: quiz
    prompt: Quiz
    quizPrompt: Ciudad?
    answer: madrid
    normalize: lowercase
    targetLat: 40.4169
    targetLon: -3.7035
    radiusMeters: 60
`;

describe("location puzzles", () => {
  it("reach resuelve con coordenadas válidas", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    const r = applyAction(session, {
      type: "submit_location",
      puzzleId: "reach1",
      lat: 40.417,
      lon: -3.7035,
      accuracyMeters: 15,
    });
    expect(r.ok).toBe(true);
    expect(session.solvedPuzzles.has("reach1")).toBe(true);
  });

  it("quiz exige llegar antes de responder", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    const blocked = applyAction(session, {
      type: "submit_answer",
      puzzleId: "quiz1",
      value: "madrid",
    });
    expect(blocked.ok).toBe(false);

    applyAction(session, {
      type: "submit_location",
      puzzleId: "quiz1",
      lat: 40.41695,
      lon: -3.70348,
      accuracyMeters: 20,
    });

    const ok = applyAction(session, {
      type: "submit_answer",
      puzzleId: "quiz1",
      value: "madrid",
    });
    expect(ok.ok).toBe(true);
    expect(session.solvedPuzzles.has("quiz1")).toBe(true);
  });

  it("rechaza coordenadas lejos", () => {
    const session = createSession(parseRoomDefinition(roomYaml));
    const r = applyAction(session, {
      type: "submit_location",
      puzzleId: "reach1",
      lat: 41.0,
      lon: -3.7,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/m\./);
  });
});
