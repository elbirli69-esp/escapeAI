export const ROOM_FILES = {
  pilot: "pilot.yaml",
  lighthouse: "lighthouse.yaml",
  "interactive-lab": "interactive-lab.yaml",
  "geo-lab": "geo-lab.yaml",
} as const;

export type RoomId = keyof typeof ROOM_FILES;

export const ROOM_CATALOG: Array<{
  id: RoomId;
  title: string;
  summary: string;
  tagline?: string;
  coverImage?: string;
  pexelsQuery: string;
  pexelsPage?: number;
  theme?: string;
}> = [
  {
    id: "pilot",
    title: "La oficina del conserje",
    summary: "Candado, fusible y panel maestro en un bloque que despierta.",
    tagline: "Un edificio dormido, un candado que guarda secretos de otro siglo.",
    coverImage: "/media/pilot-cover.jpg",
    pexelsQuery: "urban apartment hallway mystery door padlock",
    pexelsPage: 1,
    theme: "urban",
  },
  {
    id: "lighthouse",
    title: "El faro de Punta Norte",
    summary: "Marea, almacén y un faro que debe volver a guiar barcos.",
    tagline: "Marea alta, aceite escaso y un faro que debe volver a hablar con el mar.",
    coverImage: "/media/lighthouse-cover.jpg",
    pexelsQuery: "lighthouse cliff storm ocean beacon",
    pexelsPage: 2,
    theme: "coastal",
  },
  {
    id: "interactive-lab",
    title: "Laboratorio sensorial",
    summary: "Sonido, voz, cámara e imágenes en un solo hub de pruebas.",
    tagline: "Sonido, voz, cámara e imágenes — prueba todas las pistas.",
    coverImage: "/media/pilot-basement.jpg",
    pexelsQuery: "colorful technology lab interactive screens",
    pexelsPage: 1,
    theme: "urban",
  },
  {
    id: "geo-lab",
    title: "Rally GPS (demo)",
    summary: "Llega a un waypoint y responde un quiz según tu ubicación.",
    tagline: "Llega al punto y responde preguntas del entorno.",
    coverImage: "/media/lighthouse-dock.jpg",
    pexelsQuery: "hiking map compass outdoor adventure trail",
    pexelsPage: 3,
    theme: "urban",
  },
];
