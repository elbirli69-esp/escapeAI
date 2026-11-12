import { describe, expect, it } from "vitest";
import { buildCountHint, buildObjectCheckHint, buildQrHint } from "./camera-hint.js";

describe("camera hints", () => {
  it("detecta objeto esperado", () => {
    const hint = buildObjectCheckHint(
      [{ className: "potted plant", score: 0.8, bbox: [0, 0, 0.2, 0.2] }],
      "plant",
    );
    expect(hint.matched).toBe(true);
    expect(hint.kind).toBe("object");
  });

  it("count hint con sillas", () => {
    const hint = buildCountHint(
      [
        { className: "chair", score: 0.7, bbox: [0, 0, 0.1, 0.1] },
        { className: "chair", score: 0.6, bbox: [0.2, 0, 0.1, 0.1] },
      ],
      "chair",
    );
    expect(hint.detectedCount).toBe(2);
  });

  it("qr vacío", () => {
    expect(buildQrHint(null).matched).toBe(false);
    expect(buildQrHint("ZONA-ABCD").matched).toBe(true);
  });
});
