import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, validatePlayerAtTarget } from "./geo.js";

describe("geo", () => {
  it("mide distancias razonables", () => {
    const km0 = { lat: 40.4169, lon: -3.7035 };
    const nearby = { lat: 40.4174, lon: -3.703 };
    const d = haversineDistanceMeters(km0, nearby);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(120);
  });

  it("acepta dentro del radio", () => {
    const target = { lat: 40.4169, lon: -3.7035 };
    const player = { lat: 40.41695, lon: -3.70345 };
    const r = validatePlayerAtTarget(player, target, { radiusMeters: 50 }, 25);
    expect(r.ok).toBe(true);
  });

  it("rechaza lejos o GPS impreciso", () => {
    const target = { lat: 40.4169, lon: -3.7035 };
    const far = { lat: 41.5, lon: -3.7 };
    expect(
      validatePlayerAtTarget(far, target, { radiusMeters: 40 }).ok,
    ).toBe(false);
    const badAcc = validatePlayerAtTarget(
      target,
      target,
      { radiusMeters: 40, maxAccuracyMeters: 30 },
      80,
    );
    expect(badAcc.ok).toBe(false);
    if (!badAcc.ok) expect(badAcc.reason).toBe("accuracy_too_low");
  });
});
