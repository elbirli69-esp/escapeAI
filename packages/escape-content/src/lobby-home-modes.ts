export type LobbyHomeModeId = "scan" | "create" | "join" | "organizer" | "catalog";

export type LobbyHomeModeInfo = {
  mode: LobbyHomeModeId;
  title: string;
  description: string;
  imageAlt: string;
  coverImage: string;
  pexelsQuery: string;
  pexelsPage: number;
};

/** Tarjetas del lobby inicial; Pexels sustituye portada en API si hay PEXELS_API_KEY. */
export function listLobbyHomeModes(): LobbyHomeModeInfo[] {
  return [
    {
      mode: "scan",
      title: "Escanear espacio",
      description: "ScannerAI: inventario local sin subir fotos",
      imageAlt: "Habitación con objetos para escanear",
      coverImage: "/media/pilot-basement.jpg",
      pexelsQuery: "room interior objects mystery clues",
      pexelsPage: 2,
    },
    {
      mode: "create",
      title: "Crear experiencia",
      description: "Tipo, nombre central, datos → código para invitar",
      imageAlt: "Panel de control iluminado, ambiente de misterio urbano",
      coverImage: "/media/pilot-control.jpg",
      pexelsQuery: "control panel neon lights escape",
      pexelsPage: 1,
    },
    {
      mode: "join",
      title: "Entrar como equipo",
      description: "Código del organizador + nombre del equipo",
      imageAlt: "Entrada de edificio con luces de neón",
      coverImage: "/media/pilot-entrance.jpg",
      pexelsQuery: "neon city entrance doorway night",
      pexelsPage: 3,
    },
    {
      mode: "organizer",
      title: "Panel organizador",
      description: "Ranking en vivo para TV o proyector",
      imageAlt: "Muelle junto al mar, ambiente de competición",
      coverImage: "/media/lighthouse-dock.jpg",
      pexelsQuery: "scoreboard stage lights event competition",
      pexelsPage: 1,
    },
    {
      mode: "catalog",
      title: "Catálogo clásico",
      description: "Pilot, Faro y demás salas YAML",
      imageAlt: "Faro en la costa, tormenta inminente",
      coverImage: "/media/lighthouse-cover.jpg",
      pexelsQuery: "escape room door padlock dark hallway",
      pexelsPage: 4,
    },
  ];
}
