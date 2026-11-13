import { describe, expect, it } from "vitest";
import { auditCoherence } from "./audit-coherence.js";

describe("auditCoherence", () => {
  it("no reporta errores bloqueantes en tipos de partida actuales", () => {
    const findings = auditCoherence();
    const errors = findings.filter((f) => f.severity === "error");
    if (errors.length > 0) {
      console.error(errors.map((e) => `${e.mode}: ${e.detail}`).join("\n"));
    }
    expect(errors).toEqual([]);
  });
});
