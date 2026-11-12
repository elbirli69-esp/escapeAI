import { describe, expect, it } from "vitest";
import { fuseDetectionsIntoObjects } from "./scanner-fusion.js";
import { mapCameraError, mapDetectorLoadError } from "./scanner-errors.js";
import { mapCocoLabelToCategory } from "./scanner-taxonomy.js";
import { sanitizeScannedEnvironmentInput } from "./scanner-sanitize.js";
import { defaultEnvironmentConstraints } from "./scanner.js";

describe("sanitizeScannedEnvironmentInput", () => {
  it("rechaza payloads con imagen en base64", () => {
    const r = sanitizeScannedEnvironmentInput({
      name: "Salón",
      environmentType: "living_room",
      objects: [{ id: "1", category: "chair", quantity: 1, confidence: 0.5, confirmed: true }],
      constraints: defaultEnvironmentConstraints(),
      note: "data:image/jpeg;base64,abc",
    });
    expect(r.ok).toBe(false);
  });

  it("rechaza claves prohibidas", () => {
    const r = sanitizeScannedEnvironmentInput({
      name: "Salón",
      environmentType: "living_room",
      image: "x",
      objects: [{ id: "1", category: "plant", quantity: 1, confidence: 0.9, confirmed: true }],
      constraints: defaultEnvironmentConstraints(),
    });
    expect(r.ok).toBe(false);
  });

  it("elimina campos locales del objeto", () => {
    const r = sanitizeScannedEnvironmentInput({
      name: "Cocina",
      environmentType: "kitchen",
      objects: [
        {
          id: "a",
          category: "clock",
          quantity: 1,
          confidence: 0.8,
          confirmed: true,
          sourceCaptureId: "cap-1",
          relativePosition: { zone: "n" },
        },
      ],
      constraints: defaultEnvironmentConstraints(),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const obj = r.body.objects[0]!;
      expect(obj).not.toHaveProperty("sourceCaptureId");
      expect(obj).not.toHaveProperty("relativePosition");
    }
  });

  it("exige al menos un objeto confirmado", () => {
    const r = sanitizeScannedEnvironmentInput({
      name: "Oficina",
      environmentType: "office",
      objects: [{ id: "1", category: "table", quantity: 1, confidence: 0.5, confirmed: false }],
      constraints: defaultEnvironmentConstraints(),
    });
    expect(r.ok).toBe(false);
  });
});

describe("scanner fusion", () => {
  it("agrupa por categoría y zona", () => {
    const list = fuseDetectionsIntoObjects([
      {
        captureId: "c1",
        detections: [
          { className: "chair", score: 0.7, bbox: [0.1, 0.1, 0.2, 0.2] },
          { className: "chair", score: 0.6, bbox: [0.15, 0.12, 0.18, 0.18] },
        ],
      },
    ]);
    expect(list.length).toBe(1);
    expect(list[0]!.category).toBe("chair");
    expect(list[0]!.quantity).toBe(2);
  });
});

describe("taxonomy", () => {
  it("mapea clases COCO conocidas", () => {
    expect(mapCocoLabelToCategory("book")).toBe("book");
    expect(mapCocoLabelToCategory("potted plant")).toBe("plant");
    expect(mapCocoLabelToCategory("toaster")).toBe("unknown");
  });
});

describe("scanner errors", () => {
  it("traduce NotAllowedError", () => {
    const err = new DOMException("denied", "NotAllowedError");
    expect(mapCameraError(err)).toMatch(/Permiso/);
  });

  it("mensaje de detector", () => {
    expect(mapDetectorLoadError(new Error("WebGL fail"))).toMatch(/WebGL|manual/);
  });
});
