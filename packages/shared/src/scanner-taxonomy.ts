import type { EscapeObjectCategory, RoomZone } from "./scanner.js";

/** Etiquetas COCO-SSD (80 clases) → taxonomía EscapeAI. */
const COCO_TO_ESCAPE: Record<string, EscapeObjectCategory> = {
  chair: "chair",
  couch: "sofa",
  "potted plant": "plant",
  "dining table": "table",
  bed: "decoration",
  tv: "tv",
  laptop: "decoration",
  book: "book",
  clock: "clock",
  vase: "decoration",
  bottle: "decoration",
  cup: "decoration",
  bowl: "decoration",
  "wine glass": "decoration",
  microwave: "decoration",
  oven: "decoration",
  sink: "decoration",
  refrigerator: "decoration",
  remote: "decoration",
  keyboard: "decoration",
  "cell phone": "decoration",
  "teddy bear": "decoration",
  scissors: "decoration",
  toothbrush: "decoration",
  person: "unknown",
};

export type RawDetection = {
  className: string;
  score: number;
  bbox: [number, number, number, number];
};

export function mapCocoLabelToCategory(className: string): EscapeObjectCategory {
  const key = className.toLowerCase().trim();
  return COCO_TO_ESCAPE[key] ?? "unknown";
}

export function defaultLabelForCategory(category: EscapeObjectCategory): string {
  const labels: Record<EscapeObjectCategory, string> = {
    door: "Puerta",
    window: "Ventana",
    table: "Mesa",
    chair: "Silla",
    sofa: "Sofá",
    bookshelf: "Estantería",
    book: "Libro",
    painting: "Cuadro",
    clock: "Reloj",
    plant: "Planta",
    lamp: "Lámpara",
    tv: "Televisión",
    drawer: "Cajón",
    wardrobe: "Armario",
    decoration: "Decoración",
    unknown: "Sin identificar",
  };
  return labels[category];
}

/** Cuadrante aproximado del centro del bbox (0–1). */
export function bboxToZone(bbox: [number, number, number, number]): RoomZone {
  const [x, y, w, h] = bbox;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const col = cx < 1 / 3 ? 0 : cx < 2 / 3 ? 1 : 2;
  const row = cy < 1 / 3 ? 0 : cy < 2 / 3 ? 1 : 2;
  const grid: RoomZone[][] = [
    ["nw", "n", "ne"],
    ["w", "c", "e"],
    ["sw", "s", "se"],
  ];
  return grid[row]![col]!;
}
