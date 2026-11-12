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
  theme?: string;
}> = [
  {
    id: "pilot",
    title: "La oficina del conserje",
    summary: "Candado, fusible y panel maestro en un bloque que despierta.",
    tagline: "Un edificio dormido, un candado que guarda secretos de otro siglo.",
    coverImage: "/media/pilot-cover.jpg",
    theme: "urban",
  },
  {
    id: "lighthouse",
    title: "El faro de Punta Norte",
    summary: "Marea, almacén y un faro que debe volver a guiar barcos.",
    tagline: "Marea alta, aceite escaso y una tormenta que no perdona.",
    coverImage: "/media/lighthouse-cover.jpg",
    theme: "coastal",
  },
  {
    id: "interactive-lab",
    title: "Laboratorio sensorial",
    summary: "Sonido, voz, cámara e imágenes en un solo hub de pruebas.",
    tagline: "Demuestra todas las pistas interactivas en el móvil.",
    coverImage: "/media/pilot-basement.jpg",
    theme: "urban",
  },
  {
    id: "geo-lab",
    title: "Rally GPS (demo)",
    summary: "Llega a un waypoint y responde un quiz según tu ubicación.",
    tagline: "Geolocalización validada en el motor, sin guardar tu trayecto.",
    coverImage: "/media/lighthouse-dock.jpg",
    theme: "urban",
  },
];
