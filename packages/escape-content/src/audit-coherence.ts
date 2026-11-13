import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AdventureType,
  CreateEventRequest,
  ScannedEnvironment,
  ScannedSite,
  SpatialAdventureProposal,
} from "@escapeai/shared";
import {
  defaultEnvironmentConstraints,
  deriveNearbyKeyword,
  deriveNeighborhoodQuizAnswer,
  hasGeoAnchor,
} from "@escapeai/shared";
import { applyAction, createSession, parseRoomDefinition, type RoomDefinition } from "@escapeai/escape-engine";
import { generateAdventureRoom, listAdventureTemplates } from "./generate-adventure.js";
import { ROOM_CATALOG, ROOM_FILES } from "./rooms.js";
import { listLobbyHomeModes } from "./lobby-home-modes.js";
import { sceneIdForInventoryRoom } from "./spatial/build-site-links.js";
import { buildSpatialSiteRoom } from "./spatial/build-site-room.js";
import { buildSpatialRoom } from "./spatial/build-room.js";
import { deriveBookKeyword, deriveClockDigits, deriveFinalCode } from "./spatial/derive-answers.js";
import { proposeSiteAdventures } from "./spatial/generate-site-proposals.js";
import { pickProposal, proposeSpatialAdventures } from "./spatial/generate-proposals.js";

type Severity = "error" | "warning" | "ok";

type Finding = {
  severity: Severity;
  mode: string;
  check: string;
  detail: string;
};

const rootDir = dirname(fileURLToPath(import.meta.url));
const roomsDir = join(rootDir, "..", "rooms");
const repoRoot = join(rootDir, "..", "..", "..");

const SAMPLE_EVENT_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const SAMPLE_EVENT: CreateEventRequest = {
  adventureType: "birthday",
  teamCount: 4,
  subject: { name: "Ada Lovelace", age: 36, nickname: "Ada" },
  facts: ["Nació en 1815", "Le gustan los puzzles"],
};

const sampleEnv: ScannedEnvironment = {
  id: "env-audit-1",
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
      label: "Atlas viajes",
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
    {
      id: "o5",
      category: "painting",
      label: "Cuadro",
      quantity: 2,
      confidence: 0.8,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ],
};

function push(findings: Finding[], severity: Severity, mode: string, check: string, detail: string): void {
  findings.push({ severity, mode, check, detail });
}

function loadCatalogRoom(fileName: string) {
  return parseRoomDefinition(readFileSync(join(roomsDir, fileName), "utf8"));
}

function runGeneratedWinPath(room: RoomDefinition): { ok: boolean; step?: string } {
  const session = createSession(room);
  const p = room.puzzles;

  const listen = applyAction(session, { type: "complete_interaction", puzzleId: "sound_intro", step: "listen" });
  if (!listen.ok) return { ok: false, step: "sound_intro listen" };

  if (!applyAction(session, { type: "submit_answer", puzzleId: "sound_intro", value: p.sound_intro!.answer! }).ok) {
    return { ok: false, step: "sound_intro answer" };
  }
  if (!applyAction(session, { type: "submit_answer", puzzleId: "entry_lock", value: p.entry_lock!.answer! }).ok) {
    return { ok: false, step: "entry_lock" };
  }
  if (!applyAction(session, { type: "move", sceneId: "middle" }).ok) return { ok: false, step: "move middle" };

  applyAction(session, { type: "complete_interaction", puzzleId: "camera_hunt", step: "capture" });
  if (!applyAction(session, { type: "submit_answer", puzzleId: "camera_hunt", value: p.camera_hunt!.answer! }).ok) {
    return { ok: false, step: "camera_hunt" };
  }
  if (!applyAction(session, { type: "take_item", itemId: "token" }).ok) return { ok: false, step: "take token" };
  if (
    !applyAction(session, { type: "use_item", itemId: "token", puzzleId: "token_slot" }).ok
  ) {
    return { ok: false, step: "token_slot" };
  }
  if (!applyAction(session, { type: "move", sceneId: "finale" }).ok) return { ok: false, step: "move finale" };

  applyAction(session, { type: "complete_interaction", puzzleId: "visual_gallery", step: "view" });
  if (!applyAction(session, { type: "submit_answer", puzzleId: "visual_gallery", value: p.visual_gallery!.answer! }).ok) {
    return { ok: false, step: "visual_gallery" };
  }
  const final = applyAction(session, {
    type: "submit_answer",
    puzzleId: "final_code",
    value: p.final_code!.answer!,
  });
  if (!final.ok) return { ok: false, step: "final_code" };
  if (final.state.status !== "won") return { ok: false, step: "won status" };
  return { ok: true };
}

function coastalKeywords(text: string): boolean {
  return /costa|orilla|faro|marea|niebla|mar|tormenta|olas/i.test(text);
}

function mkSiteRoomEnv(
  id: string,
  name: string,
  objects: ScannedEnvironment["objects"],
): ScannedEnvironment {
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

function auditSpatialSiteFixtures(findings: Finding[]): void {
  const salon = mkSiteRoomEnv("aaaa-1111-1111-1111-111111111111", "Salón", [
    {
      id: "c1",
      category: "clock",
      label: "Reloj",
      quantity: 1,
      confidence: 1,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ]);
  const cocina = mkSiteRoomEnv("bbbb-2222-2222-2222-222222222222", "Cocina", [
    {
      id: "c2",
      category: "clock",
      label: "Reloj",
      quantity: 1,
      confidence: 1,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
    {
      id: "b1",
      category: "book",
      label: "Atlas viajes",
      quantity: 1,
      confidence: 1,
      confirmed: true,
      interactable: true,
      movable: false,
      canHideClue: true,
      restricted: false,
    },
  ]);

  const linearSite: ScannedSite = {
    id: "site-audit-linear",
    name: "Piso audit",
    roomIds: [salon.id, cocina.id],
    links: [
      {
        id: "lnk-audit",
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

  const hubSite: ScannedSite = {
    ...linearSite,
    id: "site-audit-hub",
    name: "Piso hub",
    mapLayout: "hub",
    roomIds: [salon.id, cocina.id, mkSiteRoomEnv("cccc-3333-3333-3333-333333333333", "Dormitorio", salon.objects).id],
    links: [
      {
        id: "l1",
        fromRoomId: salon.id,
        toRoomId: cocina.id,
        label: "A cocina",
        transitionKind: "door",
        confirmed: true,
      },
      {
        id: "l2",
        fromRoomId: salon.id,
        toRoomId: "cccc-3333-3333-3333-333333333333",
        label: "A dormitorio",
        transitionKind: "door",
        confirmed: true,
      },
    ],
  };

  const dormitorio = mkSiteRoomEnv("cccc-3333-3333-3333-333333333333", "Dormitorio", salon.objects);

  const indoorEx = mkSiteRoomEnv("in1-aaaa-bbbb-cccc-dddddddddddd", "Salón", [
    {
      id: "ch1",
      category: "chair",
      label: "Silla",
      quantity: 2,
      confidence: 1,
      confirmed: true,
      interactable: false,
      movable: false,
      canHideClue: false,
      restricted: true,
    },
  ]);
  const outdoorEx: ScannedEnvironment = {
    ...mkSiteRoomEnv("out1-aaaa-bbbb-cccc-eeeeeeeeeeee", "Portal", [
      {
        id: "p1",
        category: "plant",
        label: "Ficus",
        quantity: 1,
        confidence: 1,
        confirmed: true,
        interactable: true,
        movable: false,
        canHideClue: true,
        restricted: false,
      },
    ]),
    environmentType: "exterior",
  };
  const geoExteriorSite: ScannedSite = {
    id: "site-audit-exterior-geo",
    name: "Casa audit",
    roomIds: [indoorEx.id, outdoorEx.id],
    outdoorRoomId: outdoorEx.id,
    geoContext: { city: "Valencia", neighborhood: "Ciutat Vella" },
    mapLayout: "linear",
    links: [
      {
        id: "lnk-ext",
        fromRoomId: indoorEx.id,
        toRoomId: outdoorEx.id,
        label: "Salir",
        transitionKind: "open",
        confirmed: true,
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const geoAnchorSite: ScannedSite = {
    ...geoExteriorSite,
    id: "site-audit-geo-anchor",
    name: "Casa ancla GPS",
    geoContext: {
      city: "Madrid",
      neighborhood: "Centro",
      anchorLat: 40.4168,
      anchorLon: -3.7038,
    },
  };

  const geoProposalIds = proposeSiteAdventures(geoExteriorSite, [indoorEx, outdoorEx]).map((p) => p.id);
  if (geoProposalIds.includes("spatial-site-urban")) {
    push(
      findings,
      "error",
      "spatial-site:exterior-geo",
      "proposal-set",
      "con exterior+geo no debe ofrecerse spatial-site-urban",
    );
  } else {
    push(findings, "ok", "spatial-site:exterior-geo", "proposal-set", "propuesta exterior en lugar de urbana");
  }
  if (!geoProposalIds.includes("spatial-site-exterior")) {
    push(findings, "error", "spatial-site:exterior-geo", "proposal-set", "falta spatial-site-exterior");
  }

  const roomSets: Array<{ label: string; site: ScannedSite; rooms: ScannedEnvironment[] }> = [
    { label: "linear-2", site: linearSite, rooms: [salon, cocina] },
    { label: "hub-3", site: hubSite, rooms: [salon, cocina, dormitorio] },
    { label: "exterior-geo", site: geoExteriorSite, rooms: [indoorEx, outdoorEx] },
    { label: "geo-anchor", site: geoAnchorSite, rooms: [indoorEx, outdoorEx] },
  ];

  for (const { label, site, rooms } of roomSets) {
  for (const proposal of proposeSiteAdventures(site, rooms)) {
      const mode = `spatial-site:${proposal.id}@${label}`;
      let room: RoomDefinition;
      try {
        room = buildSpatialSiteRoom(site, rooms, proposal, SAMPLE_EVENT_ID);
      } catch (e) {
        push(findings, "error", mode, "build", (e as Error).message);
        continue;
      }

      if (room.tagline !== proposal.premise) {
        push(findings, "warning", mode, "tagline-premise", "tagline de sala ≠ premise de la propuesta");
      } else {
        push(findings, "ok", mode, "tagline-premise", "tagline = premise");
      }

      const map = room.spatialSiteMap;
      if (!map) {
        push(findings, "error", mode, "spatial-map", "sin spatialSiteMap");
        continue;
      }
      if (map.rooms.length !== rooms.length) {
        push(
          findings,
          "error",
          mode,
          "spatial-map",
          `map.rooms (${map.rooms.length}) ≠ habitaciones (${rooms.length})`,
        );
      }
      if (map.suggestedVisit.length !== rooms.length) {
        push(findings, "error", mode, "visit-order", "suggestedVisit no cubre todas las habitaciones");
      } else {
        push(findings, "ok", mode, "visit-order", "ruta sugerida completa");
      }
      for (const entry of map.rooms) {
        if (!room.scenes[entry.sceneId]) {
          push(findings, "error", mode, "spatial-map", `escena ${entry.sceneId} ausente en scenes`);
        }
      }

      for (const scene of Object.values(room.scenes)) {
        for (const exit of scene.exits ?? []) {
          if (!room.scenes[exit.toSceneId]) {
            push(
              findings,
              "error",
              mode,
              "exit-target",
              `salida ${scene.id} → ${exit.toSceneId} inexistente`,
            );
          }
          if (exit.when?.type === "puzzle_solved" && !room.puzzles[exit.when.puzzleId]) {
            push(findings, "error", mode, "exit-puzzle", `salida referencia puzzle '${exit.when.puzzleId}' inexistente`);
          }
          if (exit.toSceneId === "site_finale_scene" && exit.when?.type === "puzzle_solved") {
            const pid = exit.when.puzzleId;
            const finalePuzzles = room.scenes.site_finale_scene?.puzzles ?? [];
            if (finalePuzzles.includes(pid)) {
              push(
                findings,
                "error",
                mode,
                "finale-deadlock",
                `entrada al cierre exige resolver '${pid}' antes de llegar a la escena que lo contiene`,
              );
            }
          }
        }
      }

      if (
        room.winCondition.type !== "puzzle_solved" ||
        room.winCondition.puzzleId !== "site_finale" ||
        !room.puzzles.site_finale?.answer
      ) {
        push(findings, "error", mode, "win-condition", "victoria debe ser site_finale con respuesta");
      }

      if (proposal.id === "spatial-site-recorrido") {
        const clockHour = deriveClockDigits(rooms[0]!, proposal.id);
        const bookWord = deriveBookKeyword(rooms[1] ?? rooms[0]!);
        const expectedFinale = deriveFinalCode([clockHour, bookWord], "digits");
        const actual = room.puzzles.site_finale?.answer ?? "";
        if (actual !== expectedFinale) {
          push(
            findings,
            "warning",
            mode,
            "recorrido-finale-code",
            `site_finale '${actual}' ≠ deriveFinalCode esperado '${expectedFinale}'`,
          );
        } else {
          push(findings, "ok", mode, "recorrido-finale-code", "candado final enlaza reloj+libro");
        }
      }

      try {
        createSession(room);
        push(findings, "ok", mode, "session", "RoomDefinition instanciable");
      } catch (e) {
        push(findings, "error", mode, "session", (e as Error).message);
      }

      if (proposal.id === "spatial-site-recorrido" && label === "linear-2") {
        const path = runSiteRecorridoLinearWin(room, cocina);
        if (!path.ok) {
          push(findings, "error", mode, "win-path", `recorrido lineal falló en: ${path.step}`);
        } else {
          push(findings, "ok", mode, "win-path", "recorrido lineal hasta victoria");
        }
      }

      if (site.geoContext) {
        auditSiteGeoContext(findings, mode, room, site);
      }

      if (proposal.id === "spatial-site-exterior" && (label === "exterior-geo" || label === "geo-anchor")) {
        if (label === "exterior-geo") {
          if (!map.suggestedVisit.some((v) => v.kind === "outdoor")) {
            push(findings, "error", mode, "exterior-route", "suggestedVisit sin tramo outdoor");
          } else {
            push(findings, "ok", mode, "exterior-route", "ruta incluye exterior");
          }
        }
        const path = runSiteExteriorGeoWin(room, site, proposal, indoorEx, outdoorEx);
        if (!path.ok) {
          push(findings, "error", mode, "win-path", `interior+exterior+geo falló en: ${path.step}`);
        } else {
          push(findings, "ok", mode, "win-path", "recorrido exterior con geo hasta victoria");
        }
      }
    }
  }
}

function auditSiteGeoContext(
  findings: Finding[],
  mode: string,
  room: RoomDefinition,
  site: ScannedSite,
): void {
  const geo = site.geoContext!;
  if (room.startSceneId !== "site_context") {
    push(findings, "error", mode, "geo-start", `startSceneId '${room.startSceneId}' debería site_context`);
    return;
  }
  const ctx = room.scenes.site_context;
  if (!ctx) {
    push(findings, "error", mode, "geo-start", "falta escena site_context");
    return;
  }
  const exit = ctx.exits?.[0];
  if (exit?.when?.type !== "puzzle_solved" || exit.when.puzzleId !== "site_local_curiosity") {
    push(findings, "error", mode, "geo-gate", "salida de site_context debe exigir site_local_curiosity");
  } else {
    push(findings, "ok", mode, "geo-gate", "entrada al recinto tras curiosidad local");
  }
  if (hasGeoAnchor(geo)) {
    if (!room.puzzles.site_area_geo) {
      push(findings, "error", mode, "geo-puzzles", "ancla GPS pero falta site_area_geo");
    } else {
      push(findings, "ok", mode, "geo-puzzles", "quiz de área con ancla");
    }
  } else if (!room.puzzles.site_text_geo) {
    push(findings, "error", mode, "geo-puzzles", "sin ancla y falta site_text_geo");
  } else {
    push(findings, "ok", mode, "geo-puzzles", "quiz textual de ciudad/barrio");
  }
  if (!/GPS|ciudad|barrio|entorno/i.test(ctx.description ?? "")) {
    push(findings, "warning", mode, "geo-copy", "site_context poco claro sobre uso del GPS");
  }
}

function runSiteExteriorGeoWin(
  room: RoomDefinition,
  site: ScannedSite,
  proposal: SpatialAdventureProposal,
  indoor: ScannedEnvironment,
  outdoor: ScannedEnvironment,
): { ok: boolean; step?: string } {
  const geo = site.geoContext;
  if (!geo) return { ok: false, step: "geo missing" };
  const session = createSession(room);
  const p = room.puzzles;
  const geoEntry = hasGeoAnchor(geo) ? "site_area_geo" : "site_text_geo";
  const geoPuzzle = p[geoEntry];
  if (!geoPuzzle?.answer) return { ok: false, step: geoEntry };

  if (geoEntry === "site_text_geo") {
    if (
      !applyAction(session, {
        type: "submit_answer",
        puzzleId: geoEntry,
        value: deriveNeighborhoodQuizAnswer(geo),
      }).ok
    ) {
      return { ok: false, step: geoEntry };
    }
  } else {
    const loc = applyAction(session, {
      type: "submit_location",
      puzzleId: geoEntry,
      lat: geo.anchorLat!,
      lon: geo.anchorLon!,
      accuracyMeters: 20,
    });
    if (!loc.ok) return { ok: false, step: `${geoEntry} arrive` };
    if (
      !applyAction(session, {
        type: "submit_answer",
        puzzleId: geoEntry,
        value: deriveNeighborhoodQuizAnswer(geo),
      }).ok
    ) {
      return { ok: false, step: `${geoEntry} quiz` };
    }
  }

  const nearby = deriveNearbyKeyword(geo, proposal.id);
  if (
    !applyAction(session, {
      type: "submit_answer",
      puzzleId: "site_local_curiosity",
      value: nearby,
    }).ok
  ) {
    return { ok: false, step: "site_local_curiosity" };
  }

  const sidIn = sceneIdForInventoryRoom(indoor.id);
  const sidOut = sceneIdForInventoryRoom(outdoor.id);
  if (!applyAction(session, { type: "move", sceneId: sidIn }).ok) {
    return { ok: false, step: `move ${sidIn}` };
  }
  if (!applyAction(session, { type: "submit_answer", puzzleId: "site_indoor_bridge", value: p.site_indoor_bridge!.answer! }).ok) {
    return { ok: false, step: "site_indoor_bridge" };
  }
  if (!applyAction(session, { type: "move", sceneId: sidOut }).ok) {
    return { ok: false, step: `move ${sidOut}` };
  }
  applyAction(session, { type: "complete_interaction", puzzleId: "site_outdoor_cam", step: "capture" });
  if (!applyAction(session, { type: "submit_answer", puzzleId: "site_outdoor_cam", value: p.site_outdoor_cam!.answer! }).ok) {
    return { ok: false, step: "site_outdoor_cam" };
  }
  if (!applyAction(session, { type: "move", sceneId: "site_finale_scene" }).ok) {
    return { ok: false, step: "move site_finale_scene" };
  }
  const final = applyAction(session, {
    type: "submit_answer",
    puzzleId: "site_finale",
    value: p.site_finale!.answer!,
  });
  if (!final.ok) return { ok: false, step: "site_finale" };
  if (final.state.status !== "won") return { ok: false, step: "won status" };
  return { ok: true };
}

function runSiteRecorridoLinearWin(
  room: RoomDefinition,
  cocina: ScannedEnvironment,
): { ok: boolean; step?: string } {
  const session = createSession(room);
  const p = room.puzzles;
  const sid1 = sceneIdForInventoryRoom(cocina.id);

  applyAction(session, { type: "complete_interaction", puzzleId: "site_clock", step: "capture" });
  if (!applyAction(session, { type: "submit_answer", puzzleId: "site_clock", value: p.site_clock!.answer! }).ok) {
    return { ok: false, step: "site_clock" };
  }
  if (!applyAction(session, { type: "move", sceneId: sid1 }).ok) {
    return { ok: false, step: `move ${sid1}` };
  }
  applyAction(session, { type: "complete_interaction", puzzleId: "site_book", step: "capture" });
  if (!applyAction(session, { type: "submit_answer", puzzleId: "site_book", value: p.site_book!.answer! }).ok) {
    return { ok: false, step: "site_book" };
  }
  if (!applyAction(session, { type: "move", sceneId: "site_finale_scene" }).ok) {
    return { ok: false, step: "move site_finale_scene" };
  }
  const final = applyAction(session, {
    type: "submit_answer",
    puzzleId: "site_finale",
    value: p.site_finale!.answer!,
  });
  if (!final.ok) return { ok: false, step: "site_finale" };
  if (final.state.status !== "won") return { ok: false, step: "won status" };
  return { ok: true };
}

export function auditCoherence(): Finding[] {
  const findings: Finding[] = [];

  // --- Catálogo ---
  for (const entry of ROOM_CATALOG) {
    const file = ROOM_FILES[entry.id];
    const room = loadCatalogRoom(file);
    const mode = `catalog:${entry.id}`;

    if (room.theme && entry.theme && room.theme !== entry.theme) {
      push(
        findings,
        "error",
        mode,
        "catalog-theme",
        `ROOM_CATALOG.theme='${entry.theme}' ≠ room.theme='${room.theme}'`,
      );
    } else {
      push(findings, "ok", mode, "catalog-theme", "theme alineado con catálogo");
    }

    if (entry.tagline && room.tagline && entry.tagline !== room.tagline) {
      push(
        findings,
        "warning",
        mode,
        "tagline-drift",
        "tagline del catálogo difiere del YAML (puede ser copy marketing distinto)",
      );
    }

    const production = entry.id === "pilot" || entry.id === "lighthouse";
    for (const puzzle of Object.values(room.puzzles)) {
      const hints = puzzle.hints ?? [];
      if (puzzle.answer && hints.length > 0) {
        for (const h of hints) {
          const ans = String(puzzle.answer);
          const digits = h.text.match(/\b\d{2,8}\b/g) ?? [];
          for (const d of digits) {
            if (d === ans) continue;
            if (ans.startsWith(d) || d.startsWith(ans)) continue;
            if (/demo|orientativ|empieza por|primeros?/i.test(h.text)) continue;
            if (h.level === 3 && (h.text.includes(ans) || /prueba|solución/i.test(h.text))) continue;
            if (!/demo|prueba|orientativ/i.test(h.text)) {
              const sev: Severity = production && h.level <= 2 ? "error" : "warning";
              push(
                findings,
                sev,
                mode,
                "hint-vs-answer",
                `'${puzzle.id}' pista ${h.level}: cifra '${d}' ≠ answer '${ans}'`,
              );
            }
          }
        }
      }
    }

    if (entry.id === "lighthouse" && room.theme !== "coastal") {
      push(findings, "error", mode, "theme-narrative", "faro sin theme coastal");
    }
    const start = room.scenes[room.startSceneId];
    if (start && room.tagline && entry.id === "lighthouse") {
      if (!coastalKeywords(start.description + start.mood)) {
        push(findings, "warning", mode, "narrative-mood", "escena inicial poco costera vs promesa de faro");
      } else {
        push(findings, "ok", mode, "narrative-mood", "escena inicial coherente con faro");
      }
    }
  }

  // --- Eventos generados (4 tipos) ---
  const types: AdventureType[] = ["celebration", "birthday", "mystery", "team"];
  const bodiesByType: Record<string, string> = {};

  for (const adventureType of types) {
    const mode = `generated:${adventureType}`;
    const input: CreateEventRequest = { ...SAMPLE_EVENT, adventureType };
    const room = generateAdventureRoom(input, SAMPLE_EVENT_ID);
    bodiesByType[adventureType] = Object.values(room.scenes)
      .map((s) => s.description + s.mood)
      .join(" ");

    const soundAns = room.puzzles.sound_intro?.answer ?? "";
    const lockAns = room.puzzles.entry_lock?.answer ?? "";
    if (!lockAns.startsWith(soundAns) || soundAns.length < 2) {
      push(
        findings,
        "error",
        mode,
        "sound-lock-chain",
        `sound_intro '${soundAns}' no es prefijo de entry_lock '${lockAns}'`,
      );
    } else {
      push(findings, "ok", mode, "sound-lock-chain", "cadena sonido → candado numérico");
    }

    if (adventureType === "mystery") {
      if (room.theme !== "coastal") {
        push(findings, "error", mode, "theme-type", `mystery debería theme=coastal, tiene '${room.theme}'`);
      }
      const body = bodiesByType[adventureType]!;
      if (!coastalKeywords(body)) {
        push(findings, "warning", mode, "tone-mystery", "textos de escena poco costeros/investigación");
      } else {
        push(findings, "ok", mode, "tone-mystery", "tono costero presente en copy");
      }
    }

    if (adventureType === "team" && room.theme !== "urban") {
      push(findings, "warning", mode, "theme-type", `team usa theme '${room.theme}' (esperado urban)`);
    }

    const nick = input.subject.nickname ?? "Ada";
    const camAns = room.puzzles.camera_hunt?.answer ?? "";
    const voiceAns = room.puzzles.voice_seal?.answer ?? "";
    if (voiceAns && voiceAns !== nick.toLowerCase()) {
      push(findings, "warning", mode, "voice-camera", `voice_seal '${voiceAns}' vs apodo '${nick}'`);
    }
    if (camAns && camAns !== nick.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/gi, "X").slice(0, 12)) {
      push(findings, "warning", mode, "voice-camera", "camera_hunt no coincide con apodo normalizado");
    } else if (camAns) {
      push(findings, "ok", mode, "voice-camera", "cámara y voz enlazadas al apodo");
    }

    const path = runGeneratedWinPath(room);
    if (!path.ok) {
      push(findings, "error", mode, "win-path", `recorrido hasta victoria falló en: ${path.step}`);
    } else {
      push(findings, "ok", mode, "win-path", "recorrido completo hasta victoria");
    }
  }

  const celBody = bodiesByType.celebration ?? "";
  const bdayBody = bodiesByType.birthday ?? "";
  if (celBody === bdayBody) {
    push(findings, "warning", "generated", "type-differentiation", "celebration y birthday comparten el mismo cuerpo de escenas");
  } else {
    push(findings, "ok", "generated", "type-differentiation", "celebration ≠ birthday en copy");
  }

  // Plantillas API vs visuales
  const templates = listAdventureTemplates();
  for (const t of templates) {
    if (t.id === "mystery" && t.theme !== "coastal") {
      push(findings, "error", `template:${t.id}`, "list-adventures", "plantilla mystery sin theme coastal");
    }
  }

  // --- Espacial ---
  const proposals = proposeSpatialAdventures(sampleEnv);
  for (const proposal of proposals) {
    const mode = `spatial:${proposal.archetype}`;
    const room = buildSpatialRoom(sampleEnv, proposal, SAMPLE_EVENT_ID);

    if (!room.puzzles.spatial_finale?.answer) {
      push(findings, "error", mode, "finale-missing", "sin respuesta en spatial_finale");
      continue;
    }

    if (proposal.archetype === "temporal") {
      const bridge = room.puzzles.spatial_bridge?.answer ?? "";
      const finale = room.puzzles.spatial_finale?.answer ?? "";
      if (bridge !== finale) {
        push(
          findings,
          "warning",
          mode,
          "bridge-finale",
          `temporal: bridge '${bridge}' y finale '${finale}' difieren (revisar copy «combinar»)`,
        );
      } else {
        push(findings, "ok", mode, "bridge-finale", "bridge y finale alineados");
      }
    }

    try {
      createSession(room);
      push(findings, "ok", mode, "session", "RoomDefinition instanciable");
    } catch (e) {
      push(findings, "error", mode, "session", (e as Error).message);
    }
  }

  const temporal = pickProposal(sampleEnv, "spatial-temporal");
  if (!temporal) {
    push(findings, "error", "spatial", "proposals", "falta propuesta spatial-temporal");
  }

  // --- Lobby cross-check (heurístico) ---
  const modes = listLobbyHomeModes();
  const catalogMode = modes.find((m) => m.mode === "catalog");
  if (catalogMode?.coverImage?.includes("lighthouse") && !/faro|costa/i.test(catalogMode.description)) {
    push(findings, "warning", "lobby:catalog", "visual-copy", "portada costera con descripción solo YAML genérica");
  }

  // --- Recinto multi-habitación (Scanner site) — último bloque del alcance ER ---
  auditSpatialSiteFixtures(findings);

  return findings;
}

function formatReport(findings: Finding[]): string {
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const oks = findings.filter((f) => f.severity === "ok");

  const byMode = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byMode.get(f.mode) ?? [];
    list.push(f);
    byMode.set(f.mode, list);
  }

  const lines: string[] = [
    `# Informe coherencia partidas — ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Resumen",
    `- Errores: **${errors.length}**`,
    `- Warnings: **${warnings.length}**`,
    `- Comprobaciones OK: **${oks.length}**`,
    "",
  ];

  if (errors.length > 0) {
    lines.push("## Errores (acción requerida)", "");
    for (const f of errors) {
      lines.push(`- **${f.mode}** · ${f.check}: ${f.detail}`);
    }
    lines.push("");
  }

  if (warnings.length > 0) {
    lines.push("## Warnings", "");
    for (const f of warnings) {
      lines.push(`- **${f.mode}** · ${f.check}: ${f.detail}`);
    }
    lines.push("");
  }

  lines.push("## Por modo (detalle)", "");
  for (const [mode, list] of [...byMode.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`### ${mode}`, "");
    for (const f of list) {
      const icon = f.severity === "ok" ? "✓" : f.severity === "warning" ? "⚠" : "✗";
      lines.push(`- ${icon} ${f.check}: ${f.detail}`);
    }
    lines.push("");
  }

  lines.push("## Recomendaciones priorizadas", "");
  const recs: string[] = [];
  if (errors.some((e) => e.check === "hint-vs-answer")) {
    recs.push("1. Corregir pistas YAML que citan códigos distintos al `answer` en salas de producción.");
  }
  if (warnings.some((w) => w.mode === "generated:mystery")) {
    recs.push("2. Reforzar léxico costero en `toneForType('mystery')` si se quiere paridad narrativa con imágenes.");
  }
  if (warnings.some((w) => w.check === "tagline-drift")) {
    recs.push("3. Unificar taglines entre `ROOM_CATALOG` y YAML o documentar divergencia marketing.");
  }
  if (warnings.some((w) => w.mode === "catalog:interactive-lab")) {
    recs.push("4. En `interactive-lab`, aclarar en pistas que son demo (evitar cifras falsas sin el disclaimer).");
  }
  if (recs.length === 0) {
    recs.push("1. Sin cambios bloqueantes; revisar warnings antes del próximo release.");
  }
  lines.push(...recs.map((r) => `- ${r}`));
  lines.push("");

  return lines.join("\n");
}

export function runAuditCoherenceCli(): void {
  const findings = auditCoherence();
  const report = formatReport(findings);
  const outPath = join(repoRoot, "docs", "coherencia-partidas-informe.md");
  writeFileSync(outPath, report, "utf8");

  const errors = findings.filter((f) => f.severity === "error");
  console.log(report);
  console.log(`\nInforme escrito en ${outPath}`);

  if (errors.length > 0) {
    console.error(`\nAuditoría: ${errors.length} error(es).`);
    process.exit(1);
  }
  console.log("\nAuditoría: sin errores bloqueantes.");
}

const isCli = process.argv[1]?.includes("audit-coherence");
if (isCli) runAuditCoherenceCli();
