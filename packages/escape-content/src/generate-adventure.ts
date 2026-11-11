import { randomUUID } from "node:crypto";
import type { AdventureType, CreateEventRequest, EventSubject } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";

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
      "/media/lighthouse-shore.jpg",
      "/media/lighthouse-tower.jpg",
      "/media/lighthouse-lamp.jpg",
    ],
  },
  team: {
    cover: "/media/pilot-cover.jpg",
    scenes: ["/media/pilot-entrance.jpg", "/media/pilot-basement.jpg", "/media/pilot-control.jpg"],
  },
};

export function listAdventureTemplates(): Array<{
  id: AdventureType;
  title: string;
  description: string;
  suggestedFacts: string[];
}> {
  return [
    {
      id: "birthday",
      title: "Cumpleaños",
      description: "Misión personal para el protagonista: años, apodos y anécdotas se convierten en códigos.",
      suggestedFacts: [
        "Ciudad donde nació",
        "Primer concierto o canción favorita",
        "Apodo de la infancia",
      ],
    },
    {
      id: "celebration",
      title: "Celebración",
      description: "Fiesta en grupo: mismo misterio, cada móvil a su ritmo.",
      suggestedFacts: ["Motivo de la fiesta", "Lugar del brindis", "Frase interna del grupo"],
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

  return {
    id: `generated-${eventId.slice(0, 8)}`,
    name: title,
    tagline: introTone.tagline,
    coverImage: imgs.cover,
    theme,
    timeLimitSec: 2700,
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
        puzzles: ["entry_lock"],
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
        puzzles: ["token_slot"],
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
        puzzles: ["final_code"],
        exits: [],
      },
    },
    puzzles: {
      entry_lock: {
        id: "entry_lock",
        type: "code",
        label: "Primer candado",
        prompt: introTone.lockPrompt,
        answer: codes.yearCode,
        normalize: "trim",
        maxHints: 3,
        hints: [
          { level: 1, text: codes.yearHint1 },
          { level: 2, text: codes.yearHint2 },
          { level: 3, text: `El código son cuatro cifras: empieza por ${codes.yearCode.slice(0, 2)}.` },
        ],
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
    },
  };
}

function defaultTitle(type: AdventureType, subject: EventSubject): string {
  const first = subject.name.split(/\s+/)[0] ?? subject.name;
  switch (type) {
    case "birthday":
      return `Operación ${first}`;
    case "celebration":
      return `La fiesta de ${first}`;
    case "mystery":
      return `Caso ${first}`;
    default:
      return `Reto ${first}`;
  }
}

function deriveCodes(subject: EventSubject, facts: string[]) {
  const yearCode = pickYearCode(subject, facts);
  const letterCode = pickLetterCode(subject.name);
  const nickname = (subject.nickname?.trim() || subject.name.split(/\s+/)[0]) ?? "";
  return {
    yearCode,
    yearHint1: subject.age
      ? `Piensa en el año en que ${nickname || "el protagonista"} cumplió… no, en el año de nacimiento (${subject.age} años hoy).`
      : `Una fecha de cuatro cifras aparece en las pistas del grupo.`,
    yearHint2: facts.find((f) => /\b(19|20)\d{2}\b/.test(f))
      ? "Revisa la primera anécdota: hay un año escondido."
      : `Suma mental: si hoy tiene ${subject.age ?? "?"} años, resta de ${new Date().getFullYear()}.`,
    letterCode,
    letterHint1: `Las iniciales y cierres del nombre «${subject.name}» pueden dar cuatro letras.`,
    letterHint2: `Prueba mayúsculas, sin tildes; piensa en ${nickname || subject.name}.`,
  };
}

function pickYearCode(subject: EventSubject, facts: string[]): string {
  if (subject.age && subject.age > 0 && subject.age < 120) {
    return String(new Date().getFullYear() - subject.age);
  }
  for (const fact of facts) {
    const m = fact.match(/\b(19|20)\d{2}\b/);
    if (m) return m[0];
  }
  return "1990";
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
    case "birthday":
      return {
        ...shared,
        tagline: `Un escape hecho a medida para ${name}.`,
        scene1Title: "Bienvenida",
        scene1Body: `Todo gira en torno a ${nickname}: en la pared, notas del equipo y un candado que no cederá hasta que recuerdes un año clave.`,
        mood1: "Confeti en el suelo, música lejana y un temporizador sin piedad.",
        scene2Title: "Sala de recuerdos",
        scene2Body: `Entre cajas, alguien dejó un objeto simbólico. Solo encaja en la ranura cuando lo tengas en el inventario.`,
        mood2: "Olor a tarta y cables viejos: lo sentimental se mezcla con lo eléctrico.",
        scene3Title: "Gran final",
        scene3Body: `La puerta principal espera un código que solo quien conoce bien a ${nickname} puede intuir.`,
        mood3: "Aplausos contenidos: queda una última cerradura.",
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
  default:
      return {
        ...shared,
        tagline: `Misión cooperativa: cada jugador con su cronómetro, misma historia.`,
        scene1Title: "Briefing",
        scene1Body: `El reto «${name}» empieza con un candado numérico atado a los datos del organizador.`,
        mood1: "Energía de equipo y pizarras llenas de garabatos.",
        scene2Title: "Taller",
        scene2Body: "Recoge el token del equipo y actívalo en la consola central.",
        mood2: "Risas nerviosas y LEDs parpadeando.",
        scene3Title: "Meta",
        scene3Body: "Quien descifre las cuatro letras finales desbloquea la victoria oficial.",
        mood3: "Cuenta atrás audible en cada móvil.",
      };
  }
}
