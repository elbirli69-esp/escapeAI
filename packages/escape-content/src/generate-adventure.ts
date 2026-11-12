import { randomUUID } from "node:crypto";
import type { AdventureType, CreateEventRequest, EventSubject } from "@escapeai/shared";
import { durationMinToSec, resolveDurationMin } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";
import { buildProceduralSoundIntro } from "./sound-digit-clues.js";

const IMAGE_SETS: Record<AdventureType, { cover: string; scenes: [string, string, string] }> = {
  birthday: {
    cover: "/media/pilot-cover.jpg",
    scenes: ["/media/pilot-entrance.jpg", "/media/pilot-basement.jpg", "/media/pilot-control.jpg"],
  },
  celebration: {
    cover: "/media/pilot-cover.jpg",
    scenes: ["/media/pilot-entrance.jpg", "/media/pilot-basement.jpg", "/media/pilot-control.jpg"],
  },
  mystery: {
    cover: "/media/lighthouse-cover.jpg",
    scenes: [
      "/media/lighthouse-dock.jpg",
      "/media/lighthouse-supply.jpg",
      "/media/lighthouse-cover.jpg",
    ],
  },
  team: {
    cover: "/media/pilot-cover.jpg",
    scenes: ["/media/pilot-entrance.jpg", "/media/pilot-basement.jpg", "/media/pilot-control.jpg"],
  },
};

const TEMPLATE_META: Record<
  AdventureType,
  { tagline: string; theme: "urban" | "coastal" }
> = {
  celebration: {
    tagline: "Competid entre equipos con datos reales del grupo.",
    theme: "urban",
  },
  birthday: {
    tagline: "Un nombre en el centro, tono íntimo y festivo.",
    theme: "urban",
  },
  mystery: {
    tagline: "Costa, niebla y pistas que no esperan al amanecer.",
    theme: "coastal",
  },
  team: {
    tagline: "Reto puro: ranking, ritmo y un código que activa el edificio.",
    theme: "urban",
  },
};

export function listAdventureTemplates(): Array<{
  id: AdventureType;
  title: string;
  description: string;
  suggestedFacts: string[];
  coverImage: string;
  theme: "urban" | "coastal";
  tagline: string;
}> {
  return [
    {
      id: "celebration",
      title: "Celebración",
      description: "Fiestas, aniversarios, encuentros: el nombre central y los datos del grupo alimentan códigos y pistas.",
      suggestedFacts: [
        "Motivo del evento",
        "Lugar o fecha simbólica (p. ej. año 2018)",
        "Frase o chiste interno del grupo",
      ],
      coverImage: IMAGE_SETS.celebration.cover,
      ...TEMPLATE_META.celebration,
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
      coverImage: IMAGE_SETS.birthday.cover,
      ...TEMPLATE_META.birthday,
    },
    {
      id: "mystery",
      title: "Misterio",
      description: "Tono investigación costera o nocturna.",
      suggestedFacts: ["Sospechoso o pista clave", "Hora del suceso", "Objeto perdido"],
      coverImage: IMAGE_SETS.mystery.cover,
      ...TEMPLATE_META.mystery,
    },
    {
      id: "team",
      title: "Reto de equipo",
      description: "Escape genérico para competir entre equipos.",
      suggestedFacts: ["Nombre del reto", "Regla interna", "Meta del día"],
      coverImage: IMAGE_SETS.team.cover,
      ...TEMPLATE_META.team,
    },
  ];
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
        description: introTone.scene3Body,
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
        prompt: introTone.finalPrompt,
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
        label: "Sello vocal",
        interactionHints: [
          "Repite el apodo que ya usaste en la prueba de cámara.",
          "El código de cuatro letras del mismo acto viene de las iniciales del nombre central.",
        ],
        prompt: `Di en voz alta el apodo «${nickname}» para sellar la victoria (opcional antes del código final).`,
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
      };
    case "mystery":
      return {
        ...shared,
        tagline: `Investiga, conecta datos y sal antes de que expire el plazo.`,
        scene1Title: "Orilla",
        scene1Body: `Un dossier con el nombre ${name} marca el inicio. La primera cerradura guarda una fecha del informe.`,
        mood1: "Niebla, faro lejano, pasos en la arena.",
        scene2Title: "Torre",
        scene2Body: "Una evidencia material debe colocarse en el mecanismo del ascensor improvisado.",
        mood2: "Viento salado y tablones crujiendo.",
        scene3Title: "Linterna",
        scene3Body: "El culpable no importa ahora: importa el código que abre la salida.",
        mood3: "Luz intermitente, olas contra la roca.",
      };
    case "team":
      return {
        ...shared,
        tagline: `Reto «${name}»: competid en paralelo con la misma sala.`,
        scene1Title: "Briefing",
        scene1Body: `El organizador fijó los datos; el candado numérico sale de ahí.`,
        mood1: "Energía de equipo y pizarras llenas de garabatos.",
        scene2Title: "Taller",
        scene2Body: "Recoge el token del equipo y actívalo en la consola central.",
        mood2: "Risas nerviosas y LEDs parpadeando.",
        scene3Title: "Meta",
        scene3Body: "Quien descifre las cuatro letras finales desbloquea la victoria oficial.",
        mood3: "Cuenta atrás audible en cada móvil.",
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
      };
  }
}
