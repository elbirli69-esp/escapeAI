import { describe, expect, it } from "vitest";
import { loadRoomById } from "@escapeai/escape-content";
import { applyAction, createSession, getExitAvailability } from "@escapeai/escape-engine";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";
import { isCatalogFailNudgeEligible, markCatalogFailNudged } from "./catalog-session.js";
import type { GmSessionMeta } from "./persistence.js";

function metaBase(overrides: Partial<GmSessionMeta> = {}): GmSessionMeta {
  return {
    sequence: 0,
    dedupeKeys: [],
    llmCallCount: 0,
    lastLlmCallMs: 0,
    visitedSceneIds: [],
    lastProgressMs: 0,
    stuckNotifiedPuzzleIds: [],
    characterTurnCount: 0,
    lastCharacterTurnMs: 0,
    paceNudgeIssued: false,
    stuckAmbientIssuedPuzzleIds: [],
    aheadFlavorIssued: false,
    bonusHintGrantedPuzzleIds: [],
    catalogFailNudgePuzzleIds: [],
    ...overrides,
  };
}

describe("catalog GameMaster assist", () => {
  it("segundo fallo en pilot emite PUZZLE_FAILED GM", async () => {
    const room = loadRoomById("pilot");
    const session = createSession(room);
    const store = new MemoryGmInterventionStore();
    const gm = new GameMasterService(store);
    await gm.processSessionStarted(session);

    const exits = getExitAvailability(session);
    const wrong1 = applyAction(session, {
      type: "submit_answer",
      puzzleId: "lockbox",
      value: "0000",
    });
    expect(wrong1.events?.some((e) => e.type === "puzzle_failed")).toBe(true);
    const gm1 = await gm.processAfterAction({
      session,
      action: { type: "submit_answer", puzzleId: "lockbox", value: "0000" },
      events: wrong1.events ?? [],
      beforeExits: exits,
    });
    expect(gm1.length).toBe(0);

    const wrong2 = applyAction(session, {
      type: "submit_answer",
      puzzleId: "lockbox",
      value: "1111",
    });
    const gm2 = await gm.processAfterAction({
      session,
      action: { type: "submit_answer", puzzleId: "lockbox", value: "1111" },
      events: wrong2.events ?? [],
      beforeExits: exits,
    });
    expect(gm2.length).toBe(1);
    expect(gm2[0].text.toLowerCase()).toContain("portal");
  });

  it("isCatalogFailNudgeEligible solo una vez por puzzle", () => {
    const room = loadRoomById("pilot");
    const session = createSession(room);
    const trigger = {
      type: "PUZZLE_FAILED" as const,
      sourceEventId: "x",
      payload: { puzzleId: "lockbox", attempts: 2 },
    };
    const meta = metaBase();
    expect(isCatalogFailNudgeEligible(session, trigger, meta)).toBe(true);
    const next = markCatalogFailNudged(meta, "lockbox");
    expect(isCatalogFailNudgeEligible(session, trigger, next)).toBe(false);
  });
});