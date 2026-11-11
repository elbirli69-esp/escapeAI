import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition, toPublicState } from "./index.js";
import { deserializeSession, serializeSession } from "./session-serialize.js";

const pilotYaml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../escape-content/rooms/pilot.yaml"),
  "utf8",
);

describe("serializeSession", () => {
  it("round-trips without losing progress", () => {
    const room = parseRoomDefinition(pilotYaml);
    const session = createSession(room);
    applyAction(session, {
      type: "submit_answer",
      puzzleId: "lockbox",
      value: "1984",
    });

    const restored = deserializeSession(serializeSession(session));
    expect(restored.currentSceneId).toBe(session.currentSceneId);
    expect([...restored.solvedPuzzles]).toEqual([...session.solvedPuzzles]);
    expect(toPublicState(restored).narrative).toEqual(toPublicState(session).narrative);
  });
});
