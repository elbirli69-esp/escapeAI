export const ROOM_FILES = {
  pilot: "pilot.yaml",
  lighthouse: "lighthouse.yaml",
} as const;

export type RoomId = keyof typeof ROOM_FILES;

export const ROOM_CATALOG: Array<{ id: RoomId; title: string; summary: string }> = [
  {
    id: "pilot",
    title: "La oficina del conserje",
    summary: "Edificio urbano, candado y cuadro eléctrico.",
  },
  {
    id: "lighthouse",
    title: "El faro de Punta Norte",
    summary: "Tormenta en el muelle, aceite y señal de socorro.",
  },
];
