import { randomUUID } from "node:crypto";
import type { AdventureType, CreateEventRequest, EventSubject } from "@escapeai/shared";
import { durationMinToSec, resolveDurationMin } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";
import { buildProceduralSoundIntro } from "./sound-digit-clues.js";

type AdventureVisual = {
  cover: string;
  pexelsQuery: string;
  scenes: [string, string, string];
  tagline: string;
  theme: "urban" | "coastal";
};

/** Fotos locales del repo (salas pilot/lighthouse); Pexels sustituye portada en lobby si hay API key. */
const ADVENTURE_VISUAL: Record<AdventureType, AdventureVisual> = {
  celebration: {
    cover: "/media/lighthouse-dock.jpg",
    pexelsQuery: "confetti friends party dancing night",
    scenes: ["/media/lighthouse-dock.jpg", "/media/pilot-entrance.jpg", "/media/pilot-control.jpg"],
    tagline: "Fiesta y datos del grupo en la pista.",
    theme: "urban",
  },
  birthday: {
    cover: "/media/pilot-entrance.jpg",
    pexelsQuery: "birthday cake candles colorful close up",
    scenes: ["/media/pilot-entrance.jpg", "/media/pilot-cover.jpg", "/media/pilot-basement.jpg"],
    tagline: "Homenaje íntimo en torno a una persona.",
    theme: "urban",
  },
  mystery: {
    cover: "/media/lighthouse-cover.jpg",
    pexelsQuery: "lighthouse fog storm mystery coast",
    scenes: [
      "/media/lighthouse-dock.jpg",
      "/media/lighthouse-supply.jpg",
      "/media/lighthouse-cover.jpg",
    ],
    tagline: "Costa, niebla y pistas nocturnas.",
    theme: "coastal",
  },
  team: {
    cover: "/media/pilot-control.jpg",
    pexelsQuery: "escape room teamwork puzzle neon",
    scenes: ["/media/pilot-control.jpg", "/media/pilot-basement.jpg", "/media/pilot-entrance.jpg"],
    tagline: "Ranking y ritmo entre equipos.",
    theme: "urban",
  },
};

const IMAGE_SETS: Record<AdventureType, { cover: string; scenes: [string, string, string] }> = {
  celebration: {
    cover: ADVENTURE_VISUAL.celebration.cover,
    scenes: ADVENTURE_VISUAL.celebration.scenes,
  },
  birthday: {
    cover: ADVENTURE_VISUAL.birthday.cover,
    scenes: ADVENTURE_VISUAL.birthday.scenes,
  },
  mystery: {
    cover: ADVENTURE_VISUAL.mystery.cover,
    scenes: ADVENTURE_VISUAL.mystery.scenes,
  },
  team: {
    cover: ADVENTURE_VISUAL.team.cover,
    scenes: ADVENTURE_VISUAL.team.scenes,
  },
};

export function listAdventureTemplates(): Array<{
  id: AdventureType;
  title: string;
  description: string;
  suggestedFacts: string[];
  coverImage: string;
  pexelsQuery: string;
  theme: "urban" | "coastal";
  tagline: string;
}> {
  const defs: Array<{
    id: AdventureType;
    title: string;
    description: string;
    suggestedFacts: string[];
  }> = [
    {
      id: "celebration",
      title: "Celebración",
      description: "Fiestas, aniversarios, encuentros: el nombre central y los datos del grupo alimentan códigos y pistas.",
      suggestedFacts: [
        "Motivo del evento",
        "Lugar o fecha simbólica (p. ej. año 2018)",
        "Frase o chiste interno del grupo",
      ],
    },
    {
      id: "birthday",
      title: "Homenaje personal",
      description: "Una persona en el centro: mismas reglas que cualquier celebración, tono más íntimo.",
      suggestedFacts: [
        "Lugar o año que recordáis juntos",
        "Apodo o canción favorita",
        "Detalle que solo los del grupo saben",
      ],
    },
    {
      id: "mystery",
      title: "Misterio",
      description: "Tono investigación costera o nocturna.",
      suggestedFacts: ["Sospechoso o pista clave", "Hora del suceso", "Objeto perdido"],
    },
    {
      id: "team",
      title: "Reto de equipo",
      description: "Escape genérico para competir entre equipos.",
      suggestedFacts: ["Nombre del reto", "Regla interna", "Meta del día"],
    },
  ];

  return defs.map((d) => {
    const visual = ADVENTURE_VISUAL[d.id];
    return {
      ...d,
      coverImage: visual.cover,
      pexelsQuery: visual.pexelsQuery,
      theme: visual.theme,
      tagline: visual.tagline,
    };
  });
}

export function generateAdventureRoom(
  input: CreateEventRequest,
  eventId = randomUUID(),
): RoomDefinition {
  const title =
    input.eventTitle?.trim() ||
    defaultTitle(input.adventureType, input.subject);
  const codes = deriveCodes(input.subject, input.facts);
  const imgs = IMAGE_SETS[input.adventureType];
  const theme =
    input.adventureType === "mystery" ? "coastal" : input.adventureType === "birthday" ? "urban" : "urban";

  const factA = sanitizeFact(input.facts[0], input.subject.name);
  const factB = sanitizeFact(input.facts[1] ?? input.facts[0], input.subject.name);
  const nickname =
    (input.subject.nickname?.trim() || input.subject.name.split(/\s+/)[0]) ?? "protagonista";

  const introTone = toneForType(input.adventureType, input.subject.name, nickname);
  const soundIntro = buildProceduralSoundIntro({
    eventId,
    twoDigitAnswer: codes.yearCode.slice(0, 2),
    nickname,
    factSnippet: factA,
  });

  return {
    id: `generated-${eventId.slice(0, 8)}`,
    name: title,
    tagline: introTone.tagline,
    coverImage: imgs.cover,
    theme,
    timeLimitSec: durationMinToSec(resolveDurationMin(input)),
    startSceneId: "start",
    winCondition: { type: "puzzle_solved", puzzleId: "final_code" },
    items: {
      token: {
        name: `Recuerdo de ${nickname}`,
        description: factB,
      },
    },
    scenes: {
      start: {
        id: "start",
        title: introTone.scene1Title,
        image: imgs.scenes[0],
        mood: introTone.mood1,
        description: `${introTone.scene1Body} ${factA}`,
        puzzles: ["sound_intro", "entry_lock"],
        exits: [
          {
            toSceneId: "middle",
            label: "Continuar",
            when: { type: "puzzle_solved", puzzleId: "entry_lock" },
          },
        ],
      },
      middle: {
        id: "middle",
        title: introTone.scene2Title,
        image: imgs.scenes[1],
        mood: introTone.mood2,
        description: introTone.scene2Body,
        items: ["token"],
        puzzles: ["camera_hunt", "token_slot"],
        exits: [
          {
            toSceneId: "finale",
            label: "Abrir la salida",
            when: { type: "puzzle_solved", puzzleId: "token_slot" },
          },
        ],
      },
      finale: {
        id: "finale",
        title: introTone.scene3Title,
        image: imgs.scenes[2],
        mood: introTone.mood3,
        description: introTone.finaleSceneBody,
        puzzles: ["visual_gallery", "final_code", "voice_seal"],
        exits: [],
      },
    },
    puzzles: {
      sound_intro: {
        id: "sound_intro",
        type: "sound",
        label: "Mensaje oculto",
        prompt: soundIntro.prompt,
        soundMode: soundIntro.soundMode,
        beepPattern: soundIntro.beepPattern,
        ttsText: soundIntro.ttsText,
        interactionHints: soundIntro.interactionHints,
        answer: codes.yearCode.slice(0, 2),
        normalize: "trim",
        minListenSec: 3,
        maxHints: 2,
        hints: [
          { level: 1, text: "Son las dos primeras cifras del código numérico de la sala." },
          { level: 2, text: `Empiezan por ${codes.yearCode.slice(0, 1)}.` },
        ],
      },
      entry_lock: {
        id: "entry_lock",
        type: "code",
        label: "Primer candado",
        prompt: `${introTone.lockPrompt} El audio de la misma sala ya dio el prefijo de dos cifras.`,
        interactionHints: ["Combina el prefijo del mensaje oculto con el resto del código (año o cifra clave)."],
        answer: codes.yearCode,
        normalize: "trim",
        maxHints: 3,
        hints: [
          { level: 1, text: codes.yearHint1 },
          { level: 2, text: codes.yearHint2 },
          { level: 3, text: `El código son cuatro cifras: empieza por ${codes.yearCode.slice(0, 2)}.` },
        ],
      },
      camera_hunt: {
        id: "camera_hunt",
        type: "camera",
        label: "Prueba en el salón",
        cameraPrompt: `Haz una foto relacionada con: ${factA.slice(0, 60)}.`,
        interactionHints: [
          "Esta prueba no cambia el candado numérico: prueba que estuviste en el sitio del evento.",
          `La respuesta enlaza con el token y con la sala final (${nickname}).`,
        ],
        prompt: `Tras la foto, escribe en MAYÚSCULAS el apodo «${nickname}».`,
        answer: nickname.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/gi, "X").slice(0, 12) || "EQUIPO",
        normalize: "uppercase",
        maxHints: 1,
        hints: [{ level: 1, text: `El apodo del protagonista: ${nickname}.` }],
      },
      token_slot: {
        id: "token_slot",
        type: "inventory",
        label: "Ranura del recuerdo",
        prompt: `Coloca el recuerdo vinculado a ${nickname}.`,
        requiresItem: "token",
        maxHints: 2,
        hints: [
          { level: 1, text: `Coge el objeto que nombra a ${nickname}.` },
          { level: 2, text: factB },
        ],
      },
      visual_gallery: {
        id: "visual_gallery",
        type: "visual",
        label: "Galería enigma",
        prompt: `Mira la imagen. ¿Cuántas letras tiene el apodo «${nickname}»? (número)`,
        interactionHints: [
          "Paso 1 del cierre: anota el número; conecta con las iniciales de quien da nombre al evento.",
          "El código de cuatro letras (siguiente prueba) no usa este número directamente, pero confirma el apodo.",
        ],
        pexelsQuery:
          input.adventureType === "mystery"
            ? "fog lighthouse night"
            : `${nickname} celebration party`,
        falPrompt:
          input.adventureType === "birthday"
            ? `birthday mystery poster for ${nickname}, cinematic, no text`
            : undefined,
        answer: String(nickname.length),
        normalize: "trim",
        maxHints: 1,
        hints: [{ level: 1, text: `Cuenta letras de ${nickname}.` }],
      },
      final_code: {
        id: "final_code",
        type: "code",
        label: "Código final",
        prompt: `${introTone.finalPrompt} Resuelve esto para ganar la partida.`,
        interactionHints: [
          "Paso 2 del cierre: las cuatro letras salen del nombre central del evento (iniciales y cierres).",
          `Tras el visual, el candado oficial es este; no hace falta el sello de voz para victoria.`,
        ],
        answer: codes.letterCode,
        normalize: "uppercase",
        maxHints: 3,
        hints: [
          { level: 1, text: codes.letterHint1 },
          { level: 2, text: codes.letterHint2 },
          { level: 3, text: `Cuatro letras, sin espacios: relacionado con «${nickname}».` },
        ],
      },
      voice_seal: {
        id: "voice_seal",
        type: "voice",
        label: "Sello vocal (extra)",
        interactionHints: [
          "Opcional: no desbloquea la victoria; úsalo para cerrar el momento con el grupo.",
          "Repite el apodo que ya usaste en la prueba de cámara.",
        ],
        prompt: `Opcional: di el apodo «${nickname}» en voz alta para celebrar (la victoria oficial es el código de letras).`,
        answer: nickname.toLowerCase(),
        normalize: "lowercase",
        voiceMatchMode: "fuzzy",
        allowTextFallback: true,
        voiceLocale: "es-ES",
        maxHints: 1,
        hints: [{ level: 1, text: `Pronuncia: ${nickname}` }],
      },
    },
  };
}

function defaultTitle(type: AdventureType, subject: EventSubject): string {
  const first = subject.name.split(/\s+/)[0] ?? subject.name;
  switch (type) {
    case "celebration":
      return `Celebración ${first}`;
    case "birthday":
      return `Homenaje ${first}`;
    case "mystery":
      return `Caso ${first}`;
    default:
      return `Reto ${first}`;
  }
}

function deriveCodes(subject: EventSubject, facts: string[]) {
  const yearCode = pickNumericCode(subject, facts);
  const letterCode = pickLetterCode(subject.name);
  const nickname = (subject.nickname?.trim() || subject.name.split(/\s+/)[0]) ?? "";
  const key = subject.age;
  return {
    yearCode,
    yearHint1: facts.some((f) => /\b(1\d{3}|20\d{2})\b/.test(f))
      ? "Busca un año de cuatro cifras en los datos que diste al crear el evento."
      : key
        ? `La cifra clave del organizador (${key}) ayuda a formar el candado (cuatro dígitos).`
        : "Cuatro cifras: fijate en fechas y números de tus datos jugables.",
    yearHint2: facts.find((f) => /\b(1\d{3}|20\d{2})\b/.test(f))
      ? "Revisa la primera línea de datos jugables: hay un año."
      : key
        ? `Prueba rellenando con ceros: ${String(key).padStart(4, "0").slice(-4)}.`
        : `El código empieza por ${yearCode.slice(0, 2)}.`,
    letterCode,
    letterHint1: `Las iniciales y cierres de «${subject.name}» pueden dar cuatro letras.`,
    letterHint2: `Mayúsculas, sin tildes; piensa en ${nickname || subject.name}.`,
  };
}

/** Código numérico de 4 cifras: año en facts → cifra clave → fallback estable. */
function pickNumericCode(subject: EventSubject, facts: string[]): string {
  for (const fact of facts) {
    const m = fact.match(/\b(1\d{3}|20\d{2})\b/);
    if (m) return m[0];
  }
  const key = subject.age;
  if (key !== undefined && key > 0) {
    if (key >= 1000 && key <= 9999) return String(key);
    return String(key).padStart(4, "0").slice(-4);
  }
  let hash = 0;
  for (const ch of subject.name) hash = (hash * 31 + ch.charCodeAt(0)) % 9000;
  return String(1000 + hash);
}

function pickLetterCode(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]!;
    const b = parts[parts.length - 1]!;
    return (a[0]! + b[0]! + a.slice(-1) + b.slice(-1)).toUpperCase().replace(/[^A-Z]/g, "X").slice(0, 4);
  }
  const n = fullName.replace(/\s+/g, "").toUpperCase();
  return n.slice(0, 4).padEnd(4, "X");
}

function sanitizeFact(fact: string | undefined, name: string): string {
  const t = (fact ?? `Algo único de ${name}`).trim();
  return t.length > 220 ? `${t.slice(0, 217)}…` : t;
}

function toneForType(type: AdventureType, name: string, nickname: string) {
  const shared = {
    lockPrompt: "Introduce el código de cuatro cifras.",
    finalPrompt: "Introduce el código de cuatro letras.",
  };
  switch (type) {
    case "celebration":
      return {
        ...shared,
        tagline: `${name}: una misión para todo el grupo, cada móvil a su ritmo.`,
        scene1Title: "Convocatoria",
        scene1Body: `Los datos del evento rodean a ${nickname}: notas, un audio y un candado numérico.`,
        mood1: "Ambiente festivo y reloj en marcha.",
        scene2Title: "Sala de señales",
        scene2Body: `Un token simbólico y pruebas con cámara conectan los datos que compartiste al crear la partida.`,
        mood2: "Conversaciones y luces de fondo.",
        scene3Title: "Cierre",
        scene3Body: `La salida pide el código vinculado al nombre central «${name}».`,
        mood3: "Últimos minutos: el grupo compite en paralelo.",
        finaleSceneBody:
          "Primero la imagen, después el código de letras para celebrar la salida. El sello de voz es opcional para brindar.",
      };
    case "birthday":
      return {
        ...shared,
        tagline: `Homenaje a ${name}: mismo motor, tono más personal.`,
        scene1Title: "Bienvenida",
        scene1Body: `El relato gira en torno a ${nickname} y a los datos que conocen quienes están aquí.`,
        mood1: "Música suave y un candado que espera cifras.",
        scene2Title: "Recuerdos",
        scene2Body: "Un objeto simbólico encaja cuando lo tienes y completas la prueba de entorno.",
        mood2: "Mezcla de emotivo y mecánico.",
        scene3Title: "Gran final",
        scene3Body: `El último código honra a ${nickname}.`,
        mood3: "Aplauso contenido antes de la salida.",
        finaleSceneBody:
          "Cierra el homenaje con el enigma visual y el código de letras dedicado a quien da nombre al evento. La voz es un detalle emotivo extra.",
      };
    case "mystery":
      return {
        ...shared,
        tagline: `Caso vinculado a ${name}: fechas, pruebas y un cierre antes de que venza el plazo.`,
        scene1Title: "Archivo confidencial",
        scene1Body: `Expediente «${name}»: un audio distorsionado y un candado numérico sellan la primera pista del informe.`,
        mood1: "Niebla, faro lejano, pasos en la arena.",
        scene2Title: "Sala de evidencias",
        scene2Body: `Fotografiáis el entorno y colocáis el recuerdo de ${nickname} en el mecanismo que une los datos del dossier.`,
        mood2: "Viento salado y tablones crujiendo.",
        scene3Title: "Veredicto provisional",
        scene3Body: "El misterio se cierra con letras, no con sospechosos: el enigma visual precede al candado final.",
        mood3: "Luz intermitente, olas contra la roca.",
        finaleSceneBody:
          "Acto final del caso: primero el enigma visual, luego el código de cuatro letras que firma la salida. El sello de voz es un broche opcional.",
      };
    case "team":
      return {
        ...shared,
        tagline: `Carrera «${name}»: mismos puzzles, distintos tiempos en cada móvil.`,
        scene1Title: "Pistola de salida",
        scene1Body: `Briefing exprés: el audio y el candado numérico salen de los datos que fijó el organizador de «${name}».`,
        mood1: "Energía de equipo y pizarras llenas de garabatos.",
        scene2Title: "Zona de pruebas",
        scene2Body: `Token de equipo, foto en el sitio y ritmo alto: cada segundo cuenta en el ranking.`,
        mood2: "Risas nerviosas y LEDs parpadeando.",
        scene3Title: "Podio técnico",
        scene3Body: "Último sprint: enigma visual y código de letras; quien envíe primero gana la ronda.",
        mood3: "Cuenta atrás audible en cada móvil.",
        finaleSceneBody:
          "Meta del reto: resuelve el visual y el código de letras para registrar victoria. El micrófono es extra para el podio, no obligatorio.",
      };
    default:
      return {
        ...shared,
        tagline: `Misión «${name}».`,
        scene1Title: "Inicio",
        scene1Body: `Los hechos del evento guían el primer candado.`,
        mood1: "Tensión suave.",
        scene2Title: "Taller",
        scene2Body: "Objeto y prueba sensorial en el entorno.",
        mood2: "Exploración.",
        scene3Title: "Meta",
        scene3Body: "Código final ligado al nombre central.",
        mood3: "Último empujón.",
        finaleSceneBody:
          "Enigma visual, luego código de letras para victoria; el sello vocal no es obligatorio.",
      };
  }
}
