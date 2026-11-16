import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdventureType,
  CreateEventRequest,
  ScannedEnvironment,
  ScannedSite,
  SpatialMechanicId,
  SpatialPrepKind,
} from "@escapeai/shared";
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
import { proposeSiteAdventures } from "./spatial/generate-site-proposals.js";
import { proposeSpatialAdventures } from "./spatial/generate-proposals.js";
import { MECHANIC_CATALOG } from "./spatial/mechanics.js";

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

type PrepRow = {
  mode: string;
  kind: SpatialPrepKind;
  text: string;
  printRelated: boolean;
};

const PRINT_HINT = /imprim|qr|cartel|etiqueta|sticker|cinta|colore/i;

function tagsPrintRelated(text: string): boolean {
  return PRINT_HINT.test(text);
}

function collectPrepRows(): PrepRow[] {
  const rows: PrepRow[] = [];
  for (const p of proposeSpatialAdventures(sampleEnv)) {
    const mode = `spatial:${p.archetype}`;
    for (const item of p.prepChecklist) {
      rows.push({ mode, kind: item.kind, text: item.text, printRelated: tagsPrintRelated(item.text) });
    }
  }

  const salon = mkSiteRoom("aaaa-1111-1111-1111-111111111111", "Salón", sampleEnv.objects.slice(0, 2));
  const cocina = mkSiteRoom("bbbb-2222-2222-2222-222222222222", "Cocina", sampleEnv.objects);
  const site: ScannedSite = {
    id: "site-audit-fisico",
    name: "Piso audit",
    roomIds: [salon.id, cocina.id],
    links: [
      {
        id: "lnk-fisico",
        fromRoomId: salon.id,
        toRoomId: cocina.id,
        label: "Puerta",
        transitionKind: "door",
        confirmed: true,
      },
    ],
    mapLayout: "linear",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  for (const p of proposeSiteAdventures(site, [salon, cocina])) {
    const mode = `site:${p.id}`;
    for (const item of p.prepChecklist) {
      rows.push({ mode, kind: item.kind, text: item.text, printRelated: tagsPrintRelated(item.text) });
    }
  }
  return rows;
}

function mkSiteRoom(id: string, name: string, objects: ScannedEnvironment["objects"]): ScannedEnvironment {
  return {
    id,
    name,
    environmentType: "living_room",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    constraints: defaultEnvironmentConstraints(),
    objects,
  };
}

function puzzlesNeedingPhysicalSupport(snapshots: RoomSnapshot[]): Array<{ mode: string; puzzleId: string; reason: string }> {
  const out: Array<{ mode: string; puzzleId: string; reason: string }> = [];
  for (const snap of snapshots) {
    for (const p of snap.puzzles) {
      if (p.cameraMode === "qr_scan") {
        out.push({ mode: snap.mode, puzzleId: p.id, reason: "QR físico escaneable (qr_scan)" });
      }
      if (p.cameraMode === "ocr_hint") {
        out.push({ mode: snap.mode, puzzleId: p.id, reason: "Texto visible en sala (ocr_hint)" });
      }
    }
  }
  return out;
}

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
    for (const plan of p.puzzles) {
      for (const cat of plan.objectCategories) categoriesUsed.add(cat);
    }
  }

  return { byMode, globalTypes, cameraModes, locationModes, items, categoriesUsed, mechanicsUsed };
}

function formatMd(
  date: string,
  stats: ReturnType<typeof collectStats>,
  snapshots: RoomSnapshot[],
  prepRows: PrepRow[],
  physicalPuzzles: ReturnType<typeof puzzlesNeedingPhysicalSupport>,
): string {
  const { byMode, globalTypes, cameraModes, locationModes, items, categoriesUsed, mechanicsUsed } = stats;
  const unusedCategories = OBJECT_CATEGORIES.filter((c) => !categoriesUsed.has(c) && c !== "unknown");
  const unusedMechanics = ALL_MECHANICS.filter((m) => !mechanicsUsed.has(m));
  const prepSetup = prepRows.filter((r) => r.kind === "organizer_setup");
  const prepDigital = prepRows.filter((r) => r.kind === "digital_only");
  const prepPrint = prepRows.filter((r) => r.printRelated);

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
    `- **Preparación organizador (fixture):** ${prepSetup.length} \`organizer_setup\` · ${prepDigital.length} \`digital_only\` · ${prepPrint.length} con impresión/montaje explícito`,
    "",
    "## Modos digital-first (sin checklist obligatoria)",
    "",
    "Catálogo sensorial, eventos generados y geo: el motor no exige imprimir. Props narrativos (token, fusible, aceite) son recomendables para inmersión, no validados.",
    "",
    "| Modo | Impresión obligatoria en código |",
    "| ---- | -------------------------------- |",
    "| Eventos generados (4 tipos) | No (imágenes y sonido en pantalla/dispositivo) |",
    "| `interactive-lab` / `geo-lab` | No |",
    "| `pilot` / `lighthouse` | No (códigos en móvil; props opcionales) |",
    "| QR unirse al evento (`EventJoinQr`) | No (pantalla del organizador vale) |",
    "| Espacial `visual_trace` / site | **Sí** en checklist (QR, cartel, colores…) |",
    "",
    "### Espejo y piezas no modeladas",
    "",
    "- **Espejo:** no existe categoría `mirror` en el scanner; un espejo solo contaría como decoración si lo escaneáis como `decoration`/`painting`.",
    "- **Cuadros / póster:** puzzles `visual` usan imagen en **pantalla** (Pexels/API); cartel impreso en pared es montaje opcional del organizador, no requisito del motor en eventos generados.",
    "",
    "## Material imprimible y montaje (organizer)",
    "",
    "### Mecánicas que piden preparación por defecto (`MECHANIC_CATALOG`)",
    "",
    ...MECHANIC_CATALOG.filter((m) => m.needsPrepByDefault).map(
      (m) => `- \`${m.id}\` — ${m.label}`,
    ),
    "",
    "### Checklist por propuesta (fixture audit)",
    "",
  ];

  const prepByMode = new Map<string, PrepRow[]>();
  for (const row of prepRows) {
    const list = prepByMode.get(row.mode) ?? [];
    list.push(row);
    prepByMode.set(row.mode, list);
  }
  for (const [mode, items] of [...prepByMode.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`#### ${mode}`);
    if (items.length === 0) {
      lines.push("- _Sin ítems en prepChecklist._");
    } else {
      for (const item of items) {
        const flag = item.printRelated ? " 🖨" : "";
        lines.push(`- **${item.kind}**${flag}: ${item.text}`);
      }
    }
    lines.push("");
  }

  if (physicalPuzzles.length) {
    lines.push("### Puzzles en sala que exigen soporte físico (motor)", "");
    for (const row of physicalPuzzles) {
      lines.push(`- \`${row.mode}\` · \`${row.puzzleId}\` — ${row.reason}`);
    }
    lines.push("");
  }

  lines.push(
    "## Hardware del móvil (por tipo de puzzle)",
    "",
    "| Tipo | Hardware | Paso previo |",
    "| ---- | -------- | ----------- |",
  );

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
  lines.push("2. **Props código/inventory:** candados o códigos impresos alineados con `pilot` / `lighthouse` / token en eventos (opcional en software).");
  lines.push("3. **Objetos escaneables:** reloj, libros, planta, sillas (fixture); ampliar según categorías ⚠.");
  lines.push("4. **Kit impresión espacial:** QR, cartel numérico (OCR), cinta/stickers de colores, etiquetas en pasajes (site).");
  lines.push("5. **Exterior/GPS:** dispositivo con buena señal para `geo-lab` y site exterior.");
  if (prepPrint.length) {
    lines.push("", "**Ítems con mención explícita de impresión/montaje en fixture:**");
    for (const row of prepPrint) lines.push(`- [${row.mode}] ${row.text}`);
  }

  lines.push("", "## Recomendaciones priorizadas", "");
  const recs: string[] = [];
  if (prepSetup.some((r) => r.mode === "spatial:visual_trace")) {
    recs.push("Antes de un evento espacial `visual_trace`, preparar cartel + colores + QR según prepChecklist (no basta el móvil).");
  }
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
  const prepRows = collectPrepRows();
  const physicalPuzzles = puzzlesNeedingPhysicalSupport(snapshots);
  const date = new Date().toISOString().slice(0, 10);
  const md = formatMd(date, stats, snapshots, prepRows, physicalPuzzles);
  const outPath = join(repoRoot, "docs", "inventario-fisico-informe.md");
  writeFileSync(outPath, md, "utf8");
  console.log(md);
  console.log(`\nInforme escrito en ${outPath}`);
}

main();