import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { applyAction, createSession, parseRoomDefinition } from "./index.js";

const contentRoot = join(dirname(fileURLToPath(import.meta.url)), "../../escape-content/rooms");

function loadRoomFile(name: string) {
  return parseRoomDefinition(readFileSync(join(contentRoot, name), "utf8"));
}

describe("pilot room", () => {
  it("can be won end-to-end", () => {
    runPilotWinPath(loadRoomFile("pilot.yaml"));
  });
});

describe("lighthouse room", () => {
  it("can be won end-to-end", () => {
    const room = loadRoomFile("lighthouse.yaml");
    const session = createSession(room);

    expect(
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "tide_lock",
        value: "high",
      }).ok,
    ).toBe(true);

    expect(applyAction(session, { type: "move", sceneId: "supply" }).ok).toBe(true);
    expect(applyAction(session, { type: "take_item", itemId: "oil_can" }).ok).toBe(true);

    expect(
      applyAction(session, {
        type: "use_item",
        itemId: "oil_can",
        puzzleId: "refill_lamp",
      }).ok,
    ).toBe(true);

    expect(applyAction(session, { type: "move", sceneId: "lantern_room" }).ok).toBe(true);

    const final = applyAction(session, {
      type: "submit_answer",
      puzzleId: "beacon_sequence",
      value: "SOS",
    });

    expect(final.ok).toBe(true);
    expect(final.state.status).toBe("won");
  });
});

function runPilotWinPath(room: ReturnType<typeof parseRoomDefinition>) {
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
}
