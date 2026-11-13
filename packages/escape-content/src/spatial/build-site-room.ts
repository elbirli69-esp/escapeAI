import type { ScannedEnvironment, ScannedSite, SpatialAdventureProposal, SpatialSiteMapPublic } from "@escapeai/shared";
import {
  buildAreaQuizPrompt,
  buildNeighborhoodQuizQuestion,
  buildNearbyCuriosityQuestion,
  deriveNeighborhoodQuizAnswer,
  deriveNearbyKeyword,
  durationMinToSec,
  hasGeoAnchor,
  resolveSiteAreaRadius,
} from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";
import {
  deriveBookKeyword,
  deriveClockDigits,
  deriveCountAnswer,
  deriveFinalCode,
  derivePlantKeyword,
  deriveQrAnswer,
} from "./derive-answers.js";
import {
  bridgePuzzleIdForLink,
  buildInteriorExits,
  findSiteLink,
  sceneIdForInventoryRoom,
} from "./build-site-links.js";

export function buildSpatialSiteRoom(
  site: ScannedSite,
  rooms: ScannedEnvironment[],
  proposal: SpatialAdventureProposal,
  eventId: string,
): RoomDefinition {
  const ordered = site.roomIds
    .map((id) => rooms.find((r) => r.id === id))
    .filter((r): r is ScannedEnvironment => !!r);
  if (ordered.length < 2) throw new Error("Recinto incompleto: faltan inventarios de habitación.");

  const roomId = `spatial-site-${eventId.slice(0, 8)}`;
  const scenes: RoomDefinition["scenes"] = {};
  const puzzles: RoomDefinition["puzzles"] = {};

  const geo = site.geoContext;
  let startSceneId = sceneIdForInventoryRoom(ordered[0]!.id);

  if (geo) {
    startSceneId = "site_context";
    scenes.site_context = {
      id: "site_context",
      title: `Entorno: ${geo.city}`,
      description:
        "El GPS aquí solo sirve para contextualizar ciudad y barrio (preguntas del entorno), no para navegar entre habitaciones.",
      image: "/media/lighthouse-dock.jpg",
      mood: geo.neighborhood ? `Barrio ${geo.neighborhood}` : geo.city,
      puzzles: hasGeoAnchor(geo)
        ? ["site_area_geo", "site_local_curiosity"]
        : ["site_text_geo", "site_local_curiosity"],
      exits: [
        {
          toSceneId: sceneIdForInventoryRoom(ordered[0]!.id),
          label: "Empezar el recorrido interior",
          when: { type: "puzzle_solved", puzzleId: hasGeoAnchor(geo) ? "site_area_geo" : "site_text_geo" },
        },
      ],
    };

    const barrioAnswer = deriveNeighborhoodQuizAnswer(geo);
    const nearbyAnswer = deriveNearbyKeyword(geo, proposal.id);
    const radius = resolveSiteAreaRadius(geo);

    if (hasGeoAnchor(geo)) {
      puzzles.site_area_geo = {
        id: "site_area_geo",
        type: "location",
        locationMode: "quiz",
        locationIntent: "area_context",
        label: "Quiz del entorno",
        prompt: buildAreaQuizPrompt(geo),
        quizPrompt: `${buildNeighborhoodQuizQuestion(geo)} Después: ${buildNearbyCuriosityQuestion(geo, proposal.id)}`,
        answer: barrioAnswer,
        normalize: "lowercase",
        targetLat: geo.anchorLat,
        targetLon: geo.anchorLon,
        radiusMeters: radius,
        maxAccuracyMeters: 2500,
        waypointLabel: geo.neighborhood ?? geo.city,
        maxHints: 2,
        hints: [
          {
            level: 1,
            text: "No hace falta salir de la casa: el radio es amplio y cubre la ciudad o barrio indicado.",
          },
        ],
      };
    } else {
      puzzles.site_text_geo = {
        id: "site_text_geo",
        type: "code",
        label: "Contexto urbano",
        prompt: buildNeighborhoodQuizQuestion(geo),
        answer: barrioAnswer,
        normalize: "lowercase",
        interactionHints: [
          `Segunda respuesta (comercio cercano): «${nearbyAnswer}» — el organizador debe dar la pista en una carta física.`,
        ],
      };
    }
    puzzles.site_local_curiosity = {
      id: "site_local_curiosity",
      type: "code",
      label: "Establecimiento cercano",
      prompt: buildNearbyCuriosityQuestion(geo, proposal.id),
      answer: nearbyAnswer,
      normalize: "lowercase",
    };
  }

  let lastInteriorGatePuzzleId = "site_clock";
  for (let i = 0; i < ordered.length; i++) {
    const env = ordered[i]!;
    const sid = sceneIdForInventoryRoom(env.id);
    const puzzleIds: string[] = [];
    let gatePuzzleId = "site_clock";

    if (proposal.id === "spatial-site-recorrido") {
      if (i === 0) puzzleIds.push("site_clock");
      if (i === 1) puzzleIds.push("site_book");
      gatePuzzleId = i === 0 ? "site_clock" : "site_book";
    } else if (proposal.id === "spatial-site-hunt") {
      if (i === 0) puzzleIds.push("site_count");
      if (i === 1 || (i === 0 && ordered.length === 1)) puzzleIds.push("site_plant");
      gatePuzzleId = i === 0 ? "site_count" : "site_plant";
    } else if (proposal.id === "spatial-site-exterior") {
      const isOutdoor = env.id === site.outdoorRoomId || env.environmentType === "exterior";
      const indoorRooms = ordered.filter((r) => r.id !== site.outdoorRoomId && r.environmentType !== "exterior");
      const lastIndoor = indoorRooms[indoorRooms.length - 1];
      if (isOutdoor) {
        puzzleIds.push("site_outdoor_cam");
        gatePuzzleId = "site_outdoor_cam";
      } else if (lastIndoor && env.id === lastIndoor.id) {
        puzzleIds.push("site_indoor_bridge");
        gatePuzzleId = "site_indoor_bridge";
      }
    } else if (proposal.id === "spatial-site-urban") {
      if (i === ordered.length - 1) puzzleIds.push("site_urban_qr");
      gatePuzzleId = "site_urban_qr";
      if (site.mapLayout === "linear" && i < ordered.length - 1) {
        const next = ordered[i + 1]!;
        const link = findSiteLink(site, env.id, next.id);
        if (link) {
          const bridgeId = bridgePuzzleIdForLink(link);
          puzzleIds.push(bridgeId);
        }
      }
      if (site.mapLayout === "hub" && i === 0) {
        for (let j = 1; j < ordered.length; j++) {
          const link = findSiteLink(site, env.id, ordered[j]!.id);
          if (link) puzzleIds.push(bridgePuzzleIdForLink(link));
        }
      }
    }

    if (site.mapLayout === "hub" && i === 0 && proposal.id !== "spatial-site-urban") {
      for (let j = 1; j < ordered.length; j++) {
        const link = findSiteLink(site, env.id, ordered[j]!.id);
        if (link) puzzleIds.push(bridgePuzzleIdForLink(link));
      }
    }

    const exits =
      proposal.id === "spatial-site-urban" && site.mapLayout === "linear" && i < ordered.length - 1
        ? (() => {
            const next = ordered[i + 1]!;
            const link = findSiteLink(site, env.id, next.id);
            const bridgeId = link ? bridgePuzzleIdForLink(link) : "site_passage_fallback";
            return [
              {
                toSceneId: sceneIdForInventoryRoom(next.id),
                label: link?.label ?? "Siguiente estancia",
                when: { type: "puzzle_solved" as const, puzzleId: bridgeId },
              },
            ];
          })()
        : buildInteriorExits(site, ordered, i, gatePuzzleId);

    const isOutdoorSpace = env.id === site.outdoorRoomId || env.environmentType === "exterior";
    scenes[sid] = {
      id: sid,
      title: env.name,
      description: isOutdoorSpace
        ? `Tramo exterior: sal al espacio real «${env.name}». El GPS aquí solo sirve para ciudad/barrio, no para waypoints.`
        : `Muévete en el espacio real: estás jugando en «${env.name}».`,
      image: isOutdoorSpace ? "/media/lighthouse-dock.jpg" : "/media/pilot-entrance.jpg",
      mood: env.environmentType,
      puzzles: [...new Set(puzzleIds)],
      exits,
    };
    lastInteriorGatePuzzleId = gatePuzzleId;
  }

  const hubScene = sceneIdForInventoryRoom(ordered[ordered.length - 1]!.id);
  scenes[hubScene]!.exits = [
    ...(scenes[hubScene]!.exits ?? []),
    {
      toSceneId: "site_finale_scene",
      label: "Salida del recinto",
      when: { type: "puzzle_solved", puzzleId: lastInteriorGatePuzzleId },
    },
  ];

  scenes.site_finale_scene = {
    id: "site_finale_scene",
    title: "Cierre",
    description: proposal.endingDescription,
    image: "/media/pilot-control.jpg",
    mood: site.name,
    puzzles: ["site_finale"],
    exits: [],
  };

  const clockHour = deriveClockDigits(ordered[0]!, proposal.id);
  const bookWord = deriveBookKeyword(ordered[1] ?? ordered[0]!);
  const chairCount = deriveCountAnswer(ordered[0]!, "chair");
  const outdoorEnv =
    ordered.find((r) => r.id === site.outdoorRoomId) ??
    ordered.find((r) => r.environmentType === "exterior");
  const plantWord = derivePlantKeyword(
    outdoorEnv ?? ordered.find((r) => r.objects.some((o) => o.confirmed && o.category === "plant")) ?? ordered[0]!,
  );
  const indoorBridgeCount = deriveCountAnswer(
    ordered.filter((r) => r.id !== outdoorEnv?.id && r.environmentType !== "exterior")[0] ?? ordered[0]!,
    "chair",
  );
  const finalCode = deriveFinalCode([clockHour, bookWord], "digits");

  puzzles.site_clock = {
    id: "site_clock",
    type: "camera",
    label: "Reloj",
    cameraPrompt: "Fotografía el reloj de esta habitación.",
    cameraMode: "keyword",
    cameraExpectedCategory: "clock",
    allowCameraManualConfirm: true,
    prompt: `Escribe la hora relacionada con ${clockHour}.`,
    answer: clockHour,
    normalize: "trim",
  };
  puzzles.site_book = {
    id: "site_book",
    type: "camera",
    label: "Libro",
    cameraPrompt: "Fotografía el libro o estantería.",
    cameraMode: "keyword",
    cameraExpectedCategory: "book",
    allowCameraManualConfirm: true,
    prompt: `Palabra clave: ${bookWord}`,
    answer: bookWord,
    normalize: "uppercase",
  };
  puzzles.site_count = {
    id: "site_count",
    type: "code",
    label: "Conteo",
    prompt: "Sillas confirmadas en el inventario de esta habitación.",
    answer: chairCount,
    normalize: "trim",
  };
  puzzles.site_indoor_bridge = {
    id: "site_indoor_bridge",
    type: "code",
    label: "Último tramo interior",
    prompt: "Antes de salir, confirma el conteo de sillas en la última estancia interior.",
    answer: indoorBridgeCount,
    normalize: "trim",
  };
  puzzles.site_outdoor_cam = {
    id: "site_outdoor_cam",
    type: "camera",
    label: "Exterior",
    cameraPrompt: "Fotografía un elemento del espacio exterior (planta, fachada, señal).",
    cameraMode: "keyword",
    cameraExpectedCategory: "plant",
    allowCameraManualConfirm: true,
    prompt: `Escribe «${plantWord}» antes del quiz urbano opcional.`,
    answer: plantWord,
    normalize: "uppercase",
  };
  puzzles.site_plant = {
    id: "site_plant",
    type: "camera",
    label: "Planta",
    cameraPrompt: "Fotografía la planta.",
    cameraMode: "keyword",
    cameraExpectedCategory: "plant",
    allowCameraManualConfirm: true,
    prompt: `Escribe «${plantWord}».`,
    answer: plantWord,
    normalize: "uppercase",
  };
  puzzles.site_urban_qr = {
    id: "site_urban_qr",
    type: "camera",
    label: "QR pasaje",
    cameraMode: "qr_scan",
    allowCameraManualConfirm: true,
    cameraPrompt: "Escanea el QR del pasaje.",
    prompt: `Código ${deriveQrAnswer("site-urban")}`,
    answer: deriveQrAnswer("site-urban"),
    normalize: "uppercase",
  };

  for (const link of site.links) {
    const bridgeId = bridgePuzzleIdForLink(link);
    if (!puzzles[bridgeId]) {
      const fromRoom = ordered.find((r) => r.id === link.fromRoomId);
      const toRoom = ordered.find((r) => r.id === link.toRoomId);
      const route =
        fromRoom && toRoom ? `de «${fromRoom.name}» a «${toRoom.name}»` : `«${link.label}»`;
      const objectHint = ordered
        .flatMap((r) => r.objects.filter((o) => o.confirmed).map((o) => o.label ?? o.category))
        .slice(0, 3)
        .join(", ");
      puzzles[bridgeId] = {
        id: bridgeId,
        type: "code",
        label: link.label,
        prompt: `Pasaje ${route}: coloca el código en la puerta física o escanea el QR del organizador.`,
        interactionHints: [
          `Enlace confirmado: ${link.label} (${link.transitionKind}).`,
          objectHint
            ? `Objetos del inventario en juego: ${objectHint}.`
            : "Usa el inventario escaneado para orientarte en cada estancia.",
          `Código esperado: SITE-${link.id.slice(0, 4).toUpperCase()} (etiqueta o QR).`,
        ],
        answer: `SITE-${link.id.slice(0, 4).toUpperCase()}`,
        normalize: "uppercase",
      };
    }
  }

  puzzles.site_finale = {
    id: "site_finale",
    type: "code",
    label: "Candado",
    prompt: proposal.endingDescription,
    answer: finalCode,
    normalize: "trim",
  };

  if (geo && scenes.site_context?.exits?.[0]) {
    scenes.site_context.exits[0].when = {
      type: "puzzle_solved",
      puzzleId: "site_local_curiosity",
    };
  }

  const spatialSiteMap: SpatialSiteMapPublic = {
    siteName: site.name,
    mapLayout: site.mapLayout,
    rooms: ordered.map((env) => ({
      inventoryId: env.id,
      sceneId: sceneIdForInventoryRoom(env.id),
      label: env.name,
    })),
    links: site.links,
    suggestedVisit: ordered.map((env, index) => ({
      order: index + 1,
      label: env.name,
      sceneId: sceneIdForInventoryRoom(env.id),
      kind: env.id === site.outdoorRoomId || env.environmentType === "exterior" ? ("outdoor" as const) : ("indoor" as const),
    })),
  };

  return {
    id: roomId,
    name: proposal.title,
    tagline: proposal.premise,
    coverImage: "/media/pilot-cover.jpg",
    theme: "urban",
    timeLimitSec: durationMinToSec(proposal.durationMin),
    startSceneId,
    winCondition: { type: "puzzle_solved", puzzleId: "site_finale" },
    scenes,
    puzzles,
    spatialSiteMap,
    items: {
      site_map: {
        name: `Mapa de ${site.name}`,
        description: `${ordered.length} habitaciones · ${site.links.length} enlaces`,
      },
    },
  };
}
