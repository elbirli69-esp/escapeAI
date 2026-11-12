import type {
  ScannedEnvironment,
  ScannedSite,
  SiteProposalsResponse,
  SpatialAdventureProposal,
  SpatialPuzzlePlan,
} from "@escapeai/shared";
import {
  buildNeighborhoodQuizQuestion,
  deriveNeighborhoodQuizAnswer,
  deriveNearbyKeyword,
  hasGeoAnchor,
} from "@escapeai/shared";
import { deriveBookKeyword, deriveClockDigits, derivePlantKeyword } from "./derive-answers.js";

function roomLabel(env: ScannedEnvironment): string {
  return env.name;
}

function buildSiteRecorridoProposal(
  site: ScannedSite,
  rooms: ScannedEnvironment[],
): SpatialAdventureProposal {
  const [first, second] = rooms;
  const clockHour = deriveClockDigits(first, "site-recorrido");
  const bookWord = deriveBookKeyword(second ?? first);
  const geo = site.geoContext;
  const barrioAnswer = geo ? deriveNeighborhoodQuizAnswer(geo) : undefined;

  const puzzles: SpatialPuzzlePlan[] = [
    {
      puzzleId: "site_clock",
      mechanicId: "CLOCK_OBSERVATION",
      label: `Reloj en ${roomLabel(first)}`,
      objectCategories: ["clock"],
      usesExistingObject: first.objects.some((o) => o.confirmed && o.category === "clock"),
      prep: [{ kind: "organizer_setup", text: `Habitación 1 (${first.name}): reloj visible a las ${clockHour}:00.` }],
    },
  ];
  if (second) {
    puzzles.push({
      puzzleId: "site_book",
      mechanicId: "BOOK_SEARCH",
      label: `Libro en ${roomLabel(second)}`,
      objectCategories: ["book", "bookshelf"],
      usesExistingObject: second.objects.some((o) => o.confirmed && ["book", "bookshelf"].includes(o.category)),
      requiredClues: ["site_clock"],
      prep: [{ kind: "digital_only", text: `Coloca QR o texto «SITE-${bookWord}» en el pasaje entre habitaciones si quieres check-in.` }],
    });
  }
  if (geo) {
    const nearby = deriveNearbyKeyword(geo, site.id);
    puzzles.push({
      puzzleId: "site_geo",
      mechanicId: "LOCATION_DISCOVERY",
      label: "Preguntas del entorno",
      objectCategories: [],
      usesExistingObject: false,
      prep: [
        { kind: "organizer_setup", text: `Carta local: curiosidad de ${geo.city} y comercio con palabra «${nearby}».` },
        {
          kind: "digital_only",
          text: hasGeoAnchor(geo)
            ? "El GPS solo confirma ciudad/barrio para el quiz, no waypoints interiores."
            : "Sin ancla GPS: el quiz usa la ciudad indicada por el organizador.",
        },
      ],
    });
  }
  puzzles.push({
    puzzleId: "site_finale",
    mechanicId: "OBJECT_COUNT",
    label: "Candado del recinto",
    objectCategories: ["table"],
    usesExistingObject: true,
  });

  const route = rooms.map((r) => r.name).join(" → ");
  const ending = barrioAnswer
    ? `Ciudad/barrio: «${barrioAnswer}» + hora ${clockHour} + libro «${bookWord}».`
    : `Hora ${clockHour} y palabra «${bookWord}» en ${route}.`;

  return {
    id: "spatial-site-recorrido",
    archetype: "temporal",
    title: `Recorrido: ${site.name}`,
    premise: `Atraviesa ${rooms.length} espacios reales enlazados: ${route}.`,
    mystery: "¿Qué enlazan el reloj, el libro y el entorno urbano?",
    durationMin: 60,
    puzzleCount: puzzles.length,
    difficulty: rooms.length > 2 ? "hard" : "medium",
    objectsUsed: rooms.flatMap((r) => r.objects.filter((o) => o.confirmed).map((o) => o.label ?? o.category)),
    sensoryMechanics: geo
      ? ["CLOCK_OBSERVATION", "BOOK_SEARCH", "LOCATION_DISCOVERY", "OBJECT_COUNT"]
      : ["CLOCK_OBSERVATION", "BOOK_SEARCH", "OBJECT_COUNT"],
    prepChecklist: [
      ...puzzles.flatMap((p) => p.prep ?? []),
      ...site.links
        .filter((l) => l.confirmed)
        .map((l) => ({ kind: "organizer_setup" as const, text: `Pasaje confirmado: ${l.label}` })),
    ],
    endingDescription: ending,
    puzzles,
  };
}

function buildSiteHuntProposal(site: ScannedSite, rooms: ScannedEnvironment[]): SpatialAdventureProposal {
  const plantRoom = rooms.find((r) => r.objects.some((o) => o.confirmed && o.category === "plant")) ?? rooms[0]!;
  const plantWord = derivePlantKeyword(plantRoom);
  return {
    id: "spatial-site-hunt",
    archetype: "inventory_hunt",
    title: `Rastro entre habitaciones — ${site.name}`,
    premise: "Cuenta objetos en una estancia y encuentra la planta en otra.",
    mystery: "¿Qué une el conteo con la planta?",
    durationMin: 45,
    puzzleCount: 2,
    difficulty: "easy",
    objectsUsed: plantRoom.objects.filter((o) => o.confirmed).map((o) => o.label ?? o.category),
    sensoryMechanics: ["OBJECT_COUNT", "LOCATION_DISCOVERY"],
    prepChecklist: site.links.map((l) => ({
      kind: "organizer_setup" as const,
      text: l.confirmed ? `Enlace: ${l.label}` : `Confirma pasaje: ${l.label}`,
    })),
    endingDescription: `Buscar planta «${plantWord}» tras el conteo en ${rooms.map((r) => r.name).join(", ")}.`,
    puzzles: [
      {
        puzzleId: "site_count",
        mechanicId: "OBJECT_COUNT",
        label: "Conteo",
        objectCategories: ["chair"],
        usesExistingObject: rooms.some((r) => r.objects.some((o) => o.confirmed && o.category === "chair")),
      },
      {
        puzzleId: "site_plant",
        mechanicId: "LOCATION_DISCOVERY",
        label: `Planta en ${plantRoom.name}`,
        objectCategories: ["plant"],
        usesExistingObject: plantRoom.objects.some((o) => o.confirmed && o.category === "plant"),
        requiredClues: ["site_count"],
      },
    ],
  };
}

function buildSiteUrbanProposal(site: ScannedSite, rooms: ScannedEnvironment[]): SpatialAdventureProposal {
  const geo = site.geoContext;
  const quizQ = geo ? buildNeighborhoodQuizQuestion(geo) : "Indica la ciudad del recinto en minúsculas.";
  const qrRoom = rooms[rooms.length - 1]!;
  return {
    id: "spatial-site-urban",
    archetype: "visual_trace",
    title: `Entorno urbano — ${site.name}`,
    premise: geo
      ? `Preguntas sobre ${geo.city}${geo.neighborhood ? `, barrio ${geo.neighborhood}` : ""}, sin usar GPS para moverse entre habitaciones.`
      : "Mezcla de check-ins visuales entre habitaciones.",
    mystery: "¿Qué curiosidad del barrio abre la salida?",
    durationMin: 60,
    puzzleCount: geo ? 3 : 2,
    difficulty: "medium",
    objectsUsed: [],
    sensoryMechanics: geo ? ["QR_CHECKIN", "LOCATION_DISCOVERY", "VISUAL_DETAIL"] : ["QR_CHECKIN", "VISUAL_DETAIL"],
    prepChecklist: [
      ...(geo
        ? [
            {
              kind: "organizer_setup" as const,
              text: `Prepara una pregunta sobre establecimientos cercanos en ${geo.city}: ${quizQ}`,
            },
          ]
        : []),
      { kind: "organizer_setup", text: `QR en ${qrRoom.name} con código SITE-URBAN` },
    ],
    endingDescription: geo
      ? `Quiz del barrio + check-in final en ${qrRoom.name}.`
      : `Check-in visual en ${qrRoom.name}.`,
    puzzles: [
      ...(geo
        ? [
            {
              puzzleId: "site_urban_geo",
              mechanicId: "LOCATION_DISCOVERY" as const,
              label: "Quiz del barrio",
              objectCategories: [] as import("@escapeai/shared").EscapeObjectCategory[],
              usesExistingObject: false,
            },
          ]
        : []),
      {
        puzzleId: "site_urban_qr",
        mechanicId: "QR_CHECKIN",
        label: "Check-in pasaje",
        objectCategories: ["door"],
        usesExistingObject: true,
        prep: [{ kind: "organizer_setup", text: "Etiqueta en la puerta entre habitaciones." }],
      },
    ],
  };
}

export function proposeSiteAdventures(
  site: ScannedSite,
  rooms: ScannedEnvironment[],
): SpatialAdventureProposal[] {
  if (rooms.length < 2) {
    throw new Error("El recinto necesita al menos dos habitaciones.");
  }
  const ordered = site.roomIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is ScannedEnvironment => !!r);
  return [
    buildSiteRecorridoProposal(site, ordered),
    buildSiteHuntProposal(site, ordered),
    buildSiteUrbanProposal(site, ordered),
  ];
}

export function proposeSiteAdventuresResponse(
  site: ScannedSite,
  rooms: ScannedEnvironment[],
): SiteProposalsResponse {
  const versions: Record<string, number> = {};
  for (const r of rooms) versions[r.id] = r.version;
  return {
    scannedSiteId: site.id,
    siteVersion: site.version,
    roomInventoryVersions: versions,
    proposals: proposeSiteAdventures(site, rooms),
  };
}

export function pickSiteProposal(
  site: ScannedSite,
  rooms: ScannedEnvironment[],
  proposalId: string,
): SpatialAdventureProposal | undefined {
  return proposeSiteAdventures(site, rooms).find((p) => p.id === proposalId);
}
