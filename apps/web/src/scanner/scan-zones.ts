import type { RoomZone } from "@escapeai/shared";

export type ScanZoneGuide = {
  zone: RoomZone;
  title: string;
  hint: string;
};

export const SCAN_ZONE_GUIDES: ScanZoneGuide[] = [
  { zone: "nw", title: "Esquina izquierda", hint: "Apunta hacia la pared frontal izquierda." },
  { zone: "n", title: "Frente central", hint: "Centra la cámara en la pared principal." },
  { zone: "ne", title: "Esquina derecha", hint: "Recorre la zona derecha del frente." },
  { zone: "w", title: "Lateral izquierdo", hint: "Gira hacia el lateral izquierdo de la habitación." },
  { zone: "c", title: "Centro de la sala", hint: "Captura mesas, sofás o el centro del espacio." },
  { zone: "e", title: "Lateral derecho", hint: "Enfoca el lateral derecho." },
  { zone: "sw", title: "Fondo izquierda", hint: "Mira hacia la parte trasera izquierda." },
  { zone: "s", title: "Fondo central", hint: "Cubre la pared del fondo." },
  { zone: "se", title: "Fondo derecha", hint: "Cierra con la esquina trasera derecha." },
];
