import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const pilotYaml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../escape-content/rooms/pilot.yaml"),
  "utf8",
);

describe("pilot room", () => {
  it("can be won end-to-end", () => {
    const room = parseRoomDefinition(pilotYaml);
    const session = createSession(room);

    expect(
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "lockbox",
        value: "1984",
      }).ok,
    ).toBe(true);

    expect(applyAction(session, { type: "move", sceneId: "basement" }).ok).toBe(true);
    expect(applyAction(session, { type: "take_item", itemId: "fuse" }).ok).toBe(true);

    expect(
      applyAction(session, {
        type: "use_item",
        itemId: "fuse",
        puzzleId: "fuse_slot",
      }).ok,
    ).toBe(true);

    expect(applyAction(session, { type: "move", sceneId: "control" }).ok).toBe(true);

    const final = applyAction(session, {
      type: "submit_answer",
      puzzleId: "panel_final",
      value: "luz",
    });

    expect(final.ok).toBe(true);
    expect(final.state.status).toBe("won");
  });
});
