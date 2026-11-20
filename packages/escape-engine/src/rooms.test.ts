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

describe("office room (P6-E)", () => {
  it("can be won with whodunit verdict", () => {
    const room = loadRoomFile("office.yaml");
    const session = createSession(room);

    applyAction(session, { type: "complete_interaction", puzzleId: "turnstile_tone", step: "listen" });
    applyAction(session, { type: "submit_answer", puzzleId: "turnstile_tone", value: "2" });
    applyAction(session, { type: "submit_answer", puzzleId: "audit_year", value: "2024" });
    expect(applyAction(session, { type: "move", sceneId: "open_space" }).ok).toBe(true);

    applyAction(session, { type: "complete_interaction", puzzleId: "budget_chart", step: "view" });
    applyAction(session, { type: "submit_answer", puzzleId: "budget_chart", value: "3" });
    applyAction(session, { type: "submit_answer", puzzleId: "shredder_tray", value: "IRAS" });

    expect(applyAction(session, { type: "move", sceneId: "archive" }).ok).toBe(true);
    applyAction(session, { type: "submit_answer", puzzleId: "badge_log", value: "CFO" });
    expect(applyAction(session, { type: "move", sceneId: "open_space" }).ok).toBe(true);
    expect(applyAction(session, { type: "move", sceneId: "boardroom" }).ok).toBe(true);

    const win = applyAction(session, {
      type: "submit_answer",
      puzzleId: "office_accusation",
      value: "cfo",
    });
    expect(win.ok).toBe(true);
    expect(session.status).toBe("won");
  });
});

describe("lighthouse room", () => {
  it("can be won end-to-end", () => {
    const room = loadRoomFile("lighthouse.yaml");
    const session = createSession(room);

    expect(
      applyAction(session, { type: "complete_interaction", puzzleId: "fog_horn", step: "listen" })
        .ok,
    ).toBe(true);
    expect(
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "fog_horn",
        value: "2",
      }).ok,
    ).toBe(true);

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

    expect(applyAction(session, { type: "move", sceneId: "lookout" }).ok).toBe(true);
    expect(
      applyAction(session, { type: "complete_interaction", puzzleId: "storm_photo", step: "view" })
        .ok,
    ).toBe(true);
    expect(
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "storm_photo",
        value: "3",
      }).ok,
    ).toBe(true);

    expect(applyAction(session, { type: "move", sceneId: "lantern_room" }).ok).toBe(true);

    expect(
      applyAction(session, { type: "complete_interaction", puzzleId: "keeper_hail", step: "speak" })
        .ok,
    ).toBe(true);
    expect(
      applyAction(session, {
        type: "submit_answer",
        puzzleId: "keeper_hail",
        value: "sos",
      }).ok,
    ).toBe(true);

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
    applyAction(session, { type: "complete_interaction", puzzleId: "intercom_tone", step: "listen" })
      .ok,
  ).toBe(true);
  expect(
    applyAction(session, { type: "submit_answer", puzzleId: "intercom_tone", value: "1" }).ok,
  ).toBe(true);
  expect(
    applyAction(session, { type: "complete_interaction", puzzleId: "concierge_hail", step: "speak" })
      .ok,
  ).toBe(true);
  expect(
    applyAction(session, { type: "submit_answer", puzzleId: "concierge_hail", value: "conserje" }).ok,
  ).toBe(true);
  expect(
    applyAction(session, {
      type: "submit_answer",
      puzzleId: "lockbox",
      value: "1984",
    }).ok,
  ).toBe(true);

  expect(applyAction(session, { type: "move", sceneId: "mailroom" }).ok).toBe(true);
  expect(
    applyAction(session, { type: "complete_interaction", puzzleId: "mural_glance", step: "view" }).ok,
  ).toBe(true);
  expect(
    applyAction(session, { type: "submit_answer", puzzleId: "mural_glance", value: "2" }).ok,
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
