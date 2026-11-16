import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AdventureType, CreateEventRequest, ScannedEnvironment, SpatialMechanicId } from "@escapeai/shared";
import {
  ENVIRONMENT_TYPES,
  OBJECT_CATEGORIES,
  defaultEnvironmentConstraints,
  type EscapeObjectCategory,
} from "@escapeai/shared";
import {
  parseRoomDefinition,
  type PuzzleType,
  type RoomDefinition,
  type RoomPuzzle,
} from "@escapeai/escape-engine";
import { generateAdventureRoom } from "./generate-adventure.js";
import { ROOM_FILES } from "./rooms.js";
import { buildSpatialRoom } from "./spatial/build-room.js";
import { proposeSpatialAdventures } from "./spatial/generate-proposals.js";

const rootDir = dirname(fileURLToPath(import.meta.url));
const roomsDir = join(rootDir, "..", "rooms");
const repoRoot = join(rootDir, "..", "..", "..");

const HARDWARE_BY_TYPE: Record<PuzzleType, string[]> = {
  code: ["Teclado (sin sensor obligatorio)"],
  inventory: ["Prop físico en sala + interacción recoger/usar"],
  sound: ["Altavoz / audio (beeps, TTS o URL)"],
  voice: ["Micrófono (Web Speech / Vosk opcional)"],
  camera: ["Cámara trasera"],
  visual: ["Pantalla (imagen remota o generada)"],
  location: ["GPS / sensores de posición"],
};

const INTERACTION_BY_TYPE: Partial<Record<PuzzleType, string>> = {
  sound: "listen",
  voice: "speak",
  camera: "capture",
  visual: "view",
};

const ALL_MECHANICS: SpatialMechanicId[] = [
  "CLOCK_OBSERVATION",
  "BOOK_SEARCH",
  "COLOR_SEQUENCE",
  "OBJECT_COUNT",
  "VISUAL_DETAIL",
  "LOCATION_DISCOVERY",
  "QR_CHECKIN",
  "OCR_CLUE",
  "AUDIO_LOCATION",
];

const SAMPLE_EVENT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SAMPLE_EVENT: CreateEventRequest = {
  adventureType: "birthday",
  teamCount: 4,
  subject: { name: "Ada Lovelace", age: 36, nickname: "Ada" },
  facts: ["Nació en 1815", "Le gustan los puzzles"],
};

const sampleEnv: ScannedEnvironment = {
  id: "env-fisico-audit",
  name: "Salón demo",
  environmentType: "living_room",
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  constraints: defaultEnvironmentConstraints(),
  objects: [
    {
      id: "o1",
      category: "clock",
      label: "Reloj",
      quantity: 1,
      confidence: 0.9,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
    {
      id: "o2",
      category: "book",
      label: "Atlas",
      quantity: 2,
      confidence: 0.8,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
    {
      id: "o3",
      category: "chair",
      label: "Silla",
      quantity: 4,
      confidence: 0.7,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: false,
      restricted: true,
    },
    {
      id: "o4",
      category: "plant",
      label: "Ficus",
      quantity: 1,
      confidence: 0.85,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
};

type RoomSnapshot = {
  mode: string;
  puzzles: RoomPuzzle[];
  itemIds: string[];
};

function loadCatalogRooms(): RoomSnapshot[] {
  return Object.entries(ROOM_FILES).map(([id, file]) => {
    const yaml = readFileSync(join(roomsDir, file), "utf8");
    const room = parseRoomDefinition(yaml);
    return summarizeRoom(`catalog:${id}`, room);
  });
}

function loadGeneratedRooms(): RoomSnapshot[] {
  const types: AdventureType[] = ["celebration", "birthday", "mystery", "team"];
  return types.map((adventureType) => {
    const room = generateAdventureRoom({ ...SAMPLE_EVENT, adventureType }, SAMPLE_EVENT_ID);
    return summarizeRoom(`generated:${adventureType}`, room);
  });
}

function loadSpatialRooms(): RoomSnapshot[] {
  const proposals = proposeSpatialAdventures(sampleEnv);
  return proposals.map((p) => {
    const room = buildSpatialRoom(sampleEnv, p, SAMPLE_EVENT_ID);
    return summarizeRoom(`spatial:${p.archetype}`, room);
  });
}

function summarizeRoom(mode: string, room: RoomDefinition): RoomSnapshot {
  const puzzles = Object.values(room.puzzles);
  const itemIds = Object.keys(room.items ?? {});
  return { mode, puzzles, itemIds };
}

function collectStats(snapshots: RoomSnapshot[]) {
  const byMode = new Map<string, Set<PuzzleType>>();
  const globalTypes = new Set<PuzzleType>();
  const cameraModes = new Set<string>();
  const locationModes = new Set<string>();
  const items = new Set<string>();
  const categoriesUsed = new Set<EscapeObjectCategory>();
  const mechanicsUsed = new Set<SpatialMechanicId>();

  for (const snap of snapshots) {
    const set = byMode.get(snap.mode) ?? new Set();
    for (const p of snap.puzzles) {
      set.add(p.type);
      globalTypes.add(p.type);
      if (p.cameraMode) cameraModes.add(p.cameraMode);
      if (p.locationMode) locationModes.add(p.locationMode);
      if (p.cameraExpectedCategory) categoriesUsed.add(p.cameraExpectedCategory);
      if (p.cameraCountCategory) categoriesUsed.add(p.cameraCountCategory);
    }
    for (const id of snap.itemIds) items.add(id);
    byMode.set(snap.mode, set);
  }

  const proposals = proposeSpatialAdventures(sampleEnv);
  for (const p of proposals) {
    for (const m of p.sensoryMechanics) mechanicsUsed.add(m);
    for (const o of p.objectsUsed) categoriesUsed.add(o.category);
  }

  return { byMode, globalTypes, cameraModes, locationModes, items, categoriesUsed, mechanicsUsed };
}

function formatMd(date: string, stats: ReturnType<typeof collectStats>, snapshots: RoomSnapshot[]): string {
  const { byMode, globalTypes, cameraModes, locationModes, items, categoriesUsed, mechanicsUsed } = stats;
  const unusedCategories = OBJECT_CATEGORIES.filter((c) => !categoriesUsed.has(c) && c !== "unknown");
  const unusedMechanics = ALL_MECHANICS.filter((m) => !mechanicsUsed.has(m));

  const lines: string[] = [
    `# Informe inventario físico — ${date}`,
    "",
    "## Resumen ejecutivo",
    "",
    `- **Tipos de puzzle activos:** ${[...globalTypes].sort().join(", ")}`,
    `- **Items / props con id en salas auditadas:** ${items.size}`,
    `- **Categorías scanner usadas en propuestas (fixture):** ${categoriesUsed.size} / ${OBJECT_CATEGORIES.length}`,
    `- **Mecánicas espaciales declaradas:** ${mechanicsUsed.size} / ${ALL_MECHANICS.length}`,
    `- **Warnings:** ${unusedCategories.length} categorías sin uso · ${unusedMechanics.length} mecánicas sin propuesta`,
    "",
    "## Hardware del móvil (por tipo de puzzle)",
    "",
    "| Tipo | Hardware | Paso previo |",
    "| ---- | -------- | ----------- |",
  ];

  const ordered: PuzzleType[] = ["code", "inventory", "sound", "voice", "camera", "visual", "location"];
  for (const t of ordered) {
    const used = globalTypes.has(t) ? "✓ en producto" : "— no usado";
    lines.push(
      `| \`${t}\` | ${HARDWARE_BY_TYPE[t].join("; ")} | ${INTERACTION_BY_TYPE[t] ?? "—"} | ${used} |`,
    );
  }

  lines.push("", "## Por modo de partida", "");
  for (const snap of snapshots) {
    const types = [...(byMode.get(snap.mode) ?? [])].sort();
    const typeList = types.map((t) => `\`${t}\``).join(", ") || "_ninguno_";
    const props =
      snap.itemIds.length > 0
        ? snap.itemIds.map((id) => `\`${id}\``).join(", ")
        : "_sin items declarados_";
    const sensory = snap.puzzles
      .filter((p) => ["sound", "voice", "camera", "visual", "location"].includes(p.type))
      .map((p) => `${p.id} (${p.type}${p.cameraMode ? `:${p.cameraMode}` : ""}${p.locationMode ? `:${p.locationMode}` : ""})`)
      .join("; ");
    lines.push(`### ${snap.mode}`);
    lines.push(`- **Puzzle types:** ${typeList}`);
    lines.push(`- **Items:** ${props}`);
    if (sensory) lines.push(`- **Estaciones sensoriales:** ${sensory}`);
    lines.push("");
  }

  lines.push("## Scanner — taxonomía", "");
  lines.push(`Tipos de entorno soportados: ${ENVIRONMENT_TYPES.map((e) => `\`${e}\``).join(", ")}.`);
  lines.push("");
  lines.push("Categorías de objeto (catálogo completo):");
  lines.push(OBJECT_CATEGORIES.map((c) => `- \`${c}\``).join("\n"));
  lines.push("");
  lines.push("### Categorías sin uso en fixture de auditoría");
  if (unusedCategories.length === 0) {
    lines.push("- _Todas las categorías (salvo `unknown`) aparecen en propuestas o puzzles camera._");
  } else {
    for (const c of unusedCategories) lines.push(`- ⚠ \`${c}\``);
  }

  lines.push("", "## Mecánicas espaciales (`SpatialMechanicId`)", "");
  lines.push(`En propuestas del salón demo: ${[...mechanicsUsed].sort().join(", ") || "_ninguna_"}.`);
  lines.push("");
  if (unusedMechanics.length) {
    lines.push("### Sin declarar en propuestas (revisar si hace falta prop física o es digital-only)");
    for (const m of unusedMechanics) lines.push(`- ⚠ \`${m}\``);
  }

  if (cameraModes.size || locationModes.size) {
    lines.push("", "## Modos camera / location en salas auditadas", "");
    if (cameraModes.size) lines.push(`- **cameraMode:** ${[...cameraModes].join(", ")}`);
    if (locationModes.size) lines.push(`- **locationMode:** ${[...locationModes].join(", ")}`);
  }

  lines.push("", "## Lista de compra / preparación (checklist operativo)", "");
  lines.push(
    "1. **Móvil de prueba** con cámara, micrófono, GPS y altavoz (iOS + Android si podéis).",
  );
  lines.push("2. **Props código/inventory:** candados o códigos impresos alineados con `pilot` / `lighthouse` / token en eventos.");
  lines.push("3. **Objetos escaneables:** reloj, libros, planta, sillas (fixture); ampliar según categorías ⚠.");
  lines.push("4. **QR impreso** si usáis puzzles `cameraMode: qr_scan` o mecánica `QR_CHECKIN`.");
  lines.push("5. **Exterior/GPS:** dispositivo con buena señal para `geo-lab` y site exterior.");

  lines.push("", "## Recomendaciones priorizadas", "");
  const recs: string[] = [];
  if (!globalTypes.has("voice")) recs.push("Voice no aparece en generados; solo lab/evento parcial — validar mic en playtest.");
  if (unusedMechanics.includes("AUDIO_LOCATION"))
    recs.push("Preparar fuente de audio en sala si queréis explotar `AUDIO_LOCATION` en propuestas.");
  if (unusedMechanics.includes("OCR_CLUE"))
    recs.push("`OCR_CLUE` está en taxonomía pero no en propuestas demo — texto impreso grande en prop.");
  if (unusedCategories.length > 8)
    recs.push("Muchas categorías sin uso: normal en v1; priorizar las que el detector COCO devuelve bien (reloj, libro, silla, planta).");
  recs.push("Ejecutar [qa-mobile-puzzles.md](./qa-mobile-puzzles.md) en el mismo dispositivo que usaréis en evento.");
  for (let i = 0; i < Math.min(5, recs.length); i++) lines.push(`${i + 1}. ${recs[i]}`);

  lines.push("", "---", "_Generado por `pnpm audit-fisico` · brief: [prompt-inventario-fisico.md](./prompt-inventario-fisico.md)_");
  return lines.join("\n");
}

function main(): void {
  const snapshots = [...loadCatalogRooms(), ...loadGeneratedRooms(), ...loadSpatialRooms()];
  const stats = collectStats(snapshots);
  const date = new Date().toISOString().slice(0, 10);
  const md = formatMd(date, stats, snapshots);
  const outPath = join(repoRoot, "docs", "inventario-fisico-informe.md");
  writeFileSync(outPath, md, "utf8");
  console.log(md);
  console.log(`\nInforme escrito en ${outPath}`);
}

main();