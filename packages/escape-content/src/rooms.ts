export const ROOM_FILES = {
  pilot: "pilot.yaml",
  office: "office.yaml",
  lighthouse: "lighthouse.yaml",
  "demo-michelon": "demo-michelon.yaml",
  "interactive-lab": "interactive-lab.yaml",
  "geo-lab": "geo-lab.yaml",
} as const;

export type RoomId = keyof typeof ROOM_FILES;

/** Sala corta pública (P6-C): lobby → partida sin wizard. */
export const PUBLIC_DEMO_ROOM_ID = "demo-michelon" as const satisfies RoomId;

export const ROOM_CATALOG: Array<{
  id: RoomId;
  title: string;
  summary: string;
  tagline?: string;
  coverImage?: string;
  pexelsQuery: string;
  pexelsPage?: number;
  theme?: string;
  /** P6-C: destacar en lobby y post-victoria CTA a evento personalizado. */
  isPublicDemo?: boolean;
}> = [
  {
    id: "demo-michelon",
    title: "Michelón de recuerdos",
    summary: "Demo gratis ~15 min: cocina, candado y brindis — 1 o 2 jugadores.",
    tagline: "Quince minutos en la cocina de la abuela — tres pistas y una mesa puesta.",
    coverImage: "/media/lighthouse-dock.jpg",
    pexelsQuery: "cozy kitchen table dinner warm light",
    pexelsPage: 2,
    theme: "coastal",
    isPublicDemo: true,
  },
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
    id: "office",
    title: "La oficina — caso interno",
    summary: "Hub de investigación, archivo financiero y veredicto whodunit (~45 min).",
    tagline: "Finanzas en rojo, un acceso VIP a medianoche y cuatro sospechosos en open space.",
    coverImage: "/media/pilot-control.jpg",
    pexelsQuery: "corporate office night investigation desk monitors",
    pexelsPage: 2,
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
