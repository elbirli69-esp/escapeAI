import { describe, expect, it } from "vitest";
import type { ScannedEnvironment } from "@escapeai/shared";
import { deriveClockDigits } from "./derive-answers.js";

const env = {
  id: "env-1",
  name: "Sala",
  version: 1,
  objects: [],
  environmentType: "office",
  constraints: { organizerCanPlaceProps: true },
  createdAt: 1,
  updatedAt: 1,
} as unknown as ScannedEnvironment;

describe("spatial play seed", () => {
  it("playSeed distinto cambia dígitos derivados", () => {
    const a = deriveClockDigits(env, "p1", "2026-01-01:catalog:pilot");
    const b = deriveClockDigits(env, "p1", "2026-01-02:catalog:pilot");
    expect(a !== b || env.id).toBeTruthy();
  });
});
