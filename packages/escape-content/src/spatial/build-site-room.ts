import type { ScannedEnvironment, ScannedSite, SpatialAdventureProposal } from "@escapeai/shared";
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

function sceneIdForRoom(roomId: string): string {
  return `space-${roomId.slice(0, 8)}`;
}

function bridgePuzzleForLink(linkIndex: number): string {
  return `site_passage_${linkIndex}`;
}

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
  let startSceneId = sceneIdForRoom(ordered[0]!.id);

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
          toSceneId: sceneIdForRoom(ordered[0]!.id),
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

  for (let i = 0; i < ordered.length; i++) {
    const env = ordered[i]!;
    const sid = sceneIdForRoom(env.id);
    const puzzleIds: string[] = [];
    const exits: RoomDefinition["scenes"][string]["exits"] = [];

    if (proposal.id === "spatial-site-recorrido") {
      if (i === 0) puzzleIds.push("site_clock");
      if (i === 1) puzzleIds.push("site_book");
      if (i === 0 && ordered.length > 1) {
        exits.push({
          toSceneId: sceneIdForRoom(ordered[1]!.id),
          label: site.links[0]?.label ?? "Siguiente habitación",
          when: { type: "puzzle_solved", puzzleId: "site_clock" },
        });
      }
    } else if (proposal.id === "spatial-site-hunt") {
      if (i === 0) puzzleIds.push("site_count");
      if (i === 1 || (i === 0 && ordered.length === 1)) puzzleIds.push("site_plant");
      if (i === 0 && ordered.length > 1) {
        exits.push({
          toSceneId: sceneIdForRoom(ordered[1]!.id),
          label: site.links[0]?.label ?? "Buscar la planta",
          when: { type: "puzzle_solved", puzzleId: "site_count" },
        });
      }
    } else if (proposal.id === "spatial-site-urban") {
      if (i === ordered.length - 1) puzzleIds.push("site_urban_qr");
      if (i < ordered.length - 1) {
        const link = site.links[i];
        const bridgeId = bridgePuzzleForLink(i);
        puzzleIds.push(bridgeId);
        exits.push({
          toSceneId: sceneIdForRoom(ordered[i + 1]!.id),
          label: link?.label ?? "Siguiente estancia",
          when: { type: "puzzle_solved", puzzleId: bridgeId },
        });
      }
    }

    scenes[sid] = {
      id: sid,
      title: env.name,
      description: `Escena generada del inventario «${env.name}».`,
      image: "/media/pilot-entrance.jpg",
      mood: env.environmentType,
      puzzles: puzzleIds,
      exits,
    };
  }

  const hubScene = sceneIdForRoom(ordered[ordered.length - 1]!.id);
  scenes[hubScene]!.exits = [
    ...(scenes[hubScene]!.exits ?? []),
    {
      toSceneId: "site_finale_scene",
      label: "Salida del recinto",
      when: { type: "puzzle_solved", puzzleId: "site_finale" },
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
  const plantWord = derivePlantKeyword(ordered.find((r) => r.objects.some((o) => o.confirmed && o.category === "plant")) ?? ordered[0]!);
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

  site.links.forEach((link, i) => {
    const bridgeId = bridgePuzzleForLink(i);
    if (!puzzles[bridgeId]) {
      puzzles[bridgeId] = {
        id: bridgeId,
        type: "code",
        label: link.label,
        prompt: `Confirma que cruzaste: ${link.label} (texto SITE-${link.id.slice(0, 4).toUpperCase()}).`,
        answer: `SITE-${link.id.slice(0, 4).toUpperCase()}`,
        normalize: "uppercase",
      };
    }
  });

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
    items: {
      site_map: {
        name: `Mapa de ${site.name}`,
        description: `${ordered.length} habitaciones · ${site.links.length} enlaces`,
      },
    },
  };
}
