export type LobbyHomeModeId = "demo" | "scan" | "create" | "join" | "organizer" | "catalog";

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
      mode: "demo",
      title: "Prueba gratis · 15 min",
      description: "Michelón de recuerdos — 1 o 2 jugadores, sin código ni registro",
      imageAlt: "Mesa con vajilla, ambiente cálido de mesón",
      coverImage: "/media/lighthouse-dock.jpg",
      pexelsQuery: "cozy dinner table kitchen warm light",
      pexelsPage: 1,
    },
    {
      mode: "scan",
      title: "Escanear espacio",
      description: "Escanea la habitación y arma pistas sin subir fotos",
      imageAlt: "Habitación con objetos para escanear",
      coverImage: "/media/pilot-basement.jpg",
      pexelsQuery: "bright living room interior daylight decor",
      pexelsPage: 2,
    },
    {
      mode: "create",
      title: "Crear experiencia",
      description: "Diseña la fiesta y recibe un código para invitar",
      imageAlt: "Panel de control iluminado, ambiente de misterio urbano",
      coverImage: "/media/pilot-control.jpg",
      pexelsQuery: "control panel neon lights escape",
      pexelsPage: 1,
    },
    {
      mode: "join",
      title: "Entrar como equipo",
      description: "Introduce el código del organizador y el nombre de tu equipo",
      imageAlt: "Entrada de edificio con luces de neón",
      coverImage: "/media/pilot-entrance.jpg",
      pexelsQuery: "bright colorful arcade entrance neon lights",
      pexelsPage: 2,
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
      description: "Conserje, oficina corporativa, faro y salas de demostración",
      imageAlt: "Faro en la costa, tormenta inminente",
      coverImage: "/media/lighthouse-cover.jpg",
      pexelsQuery: "escape room colorful puzzle lights interior",
      pexelsPage: 4,
    },
  ];
}
