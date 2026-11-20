import { describe, expect, it } from "vitest";
import { diffGeneratedRooms } from "./facts-personalization-diff.js";

describe("facts personalization diff", () => {
  it("cambiar facts altera candados funcionales, no solo el título", () => {
    const base = {
      adventureType: "birthday" as const,
      teamCount: 2,
      subject: { name: "Elena Ruiz", nickname: "Elena" },
      facts: ["Año clave 1995", "Playa norte"],
    };
    const variant = { ...base, facts: ["Año clave 2001", "Jazz nocturno"] };
    const { diffs, auditA, auditB } = diffGeneratedRooms(base, variant);
    expect(auditA.ok).toBe(true);
    expect(auditB.ok).toBe(true);
    const functional = diffs.filter((d) => d.kind === "functional");
    expect(functional.length).toBeGreaterThanOrEqual(2);
    expect(functional.some((d) => d.path === "puzzles.entry_lock.answer")).toBe(true);
    expect(functional.some((d) => d.path === "puzzles.entry_lock.answer" && d.valueA !== d.valueB)).toBe(
      true,
    );
  });

  it("mismos facts → sin diff funcional en answers", () => {
    const input = {
      adventureType: "celebration" as const,
      teamCount: 2,
      subject: { name: "Paco", nickname: "Paco" },
      facts: ["2020", "Baile"],
    };
    const { diffs } = diffGeneratedRooms(input, { ...input });
    const answerDiffs = diffs.filter((d) => d.path.includes(".answer"));
    expect(answerDiffs.length).toBe(0);
  });
});