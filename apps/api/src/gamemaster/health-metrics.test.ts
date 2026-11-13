import { describe, expect, it } from "vitest";
import { getPilotRoom } from "@escapeai/escape-content";
import { createSession } from "@escapeai/escape-engine";
import { getGmHealthSnapshot, resetGmMetricsForTests } from "./metrics.js";
import { MemoryGmInterventionStore, GameMasterService } from "./index.js";

describe("GET /health gm runtime metrics", () => {
  it("incrementa contadores tras SESSION_STARTED", async () => {
    resetGmMetricsForTests();
    const gm = new GameMasterService(new MemoryGmInterventionStore());
    const session = createSession(getPilotRoom());
    await gm.processSessionStarted(session);
    const snap = getGmHealthSnapshot();
    expect(snap.interventionsTotal).toBeGreaterThanOrEqual(1);
    expect(snap.byTrigger.SESSION_STARTED).toBeGreaterThanOrEqual(1);
    expect(snap.staticInterventions + snap.llmFallbacks).toBeGreaterThanOrEqual(1);
  });
});
