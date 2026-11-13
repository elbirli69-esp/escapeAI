import { describe, expect, it } from "vitest";
import {
  applyTeamVariableBump,
  initTeamVariable,
  resolveTeamVariableConfig,
} from "./team-variable.js";
import type { StoredEvent } from "./event-store.js";

describe("team variable", () => {
  it("activa por defecto en modo team", () => {
    const cfg = resolveTeamVariableConfig({
      adventureType: "team",
      teamCount: 4,
      subject: { name: "Colegas" },
      facts: ["dato"],
    });
    expect(cfg?.goal).toBe(3);
    expect(cfg?.puzzleId).toBe("entry_lock");
  });

  it("solo cuenta un equipo una vez", () => {
    const base: StoredEvent = {
      eventId: "e",
      joinCode: "ABC",
      createdAtMs: 0,
      config: {
        adventureType: "team",
        teamCount: 3,
        subject: { name: "A" },
        facts: ["f"],
      },
      title: "T",
      room: {} as StoredEvent["room"],
      teams: {},
      teamVariable: initTeamVariable({
        label: "Test",
        goal: 2,
        puzzleId: "entry_lock",
      }),
    };
    const a = applyTeamVariableBump(base, "t1", "entry_lock");
    expect(a?.teamVariable?.value).toBe(1);
    const b = applyTeamVariableBump(a!, "t1", "entry_lock");
    expect(b).toBeUndefined();
    const c = applyTeamVariableBump(a!, "t2", "entry_lock");
    expect(c?.teamVariable?.value).toBe(2);
  });
});
