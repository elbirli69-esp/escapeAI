import type { SessionRecord } from "@escapeai/escape-engine";
import type { DirectorFaqId } from "@escapeai/shared";
import { computeGmPacing } from "./pacing.js";
import { primaryOpenPuzzleId } from "./hints.js";

export const GM_DIRECTOR_FAQ_MAX = Number(process.env.GM_DIRECTOR_FAQ_MAX ?? 12);
export const GM_DIRECTOR_FAQ_COOLDOWN_MS = Number(process.env.GM_DIRECTOR_FAQ_COOLDOWN_MS ?? 60_000);

export function directorFaqStaticCopy(session: SessionRecord, faqId: DirectorFaqId): string {
  const pacing = computeGmPacing(session);
  const remainingMin = Math.max(0, Math.ceil(session.room.timeLimitSec / 60));
  const elapsedMin = Math.max(0, Math.floor((Date.now() - session.startedAtMs) / 60_000));
  const openId = primaryOpenPuzzleId(session);
  const openPuzzle = openId ? session.room.puzzles[openId] : undefined;
  const openLabel = openPuzzle?.label ?? openId ?? "el reto visible";

  switch (faqId) {
    case "time_ok":
      if (pacing.mode === "critical" || pacing.mode === "behind") {
        return `Lleváis unos ${elapsedMin} min; el ritmo va ajustado. Priorizad un solo hilo y usad «Pedir pista» si un reto frena demasiado — yo no daré códigos.`;
      }
      if (pacing.mode === "ahead") {
        return `Vais por delante del reloj. Podéis revisar la escena con calma antes de forzar cerraduras.`;
      }
      return `El tiempo es asequible por ahora (partida ~${remainingMin} min). Centraos en un reto cada vez.`;
    case "puzzle_priority":
      return openId
        ? `Ahora mismo el foco está en «${openLabel}». Si hay pestañas de retos, la barra superior os muestra qué está abierto.`
        : `Revisad qué pestañas de retos están activas en esta escena; suele haber un hilo principal antes de las salidas.`;
    case "what_to_look":
      return `Mirad diario, objetos de la escena y pistas ya anotadas. Los detalles sensoriales (sonido, imagen, voz) suelen enlazarse con un reto concreto — sin que yo revele soluciones.`;
    case "stuck_no_spoiler":
      return `Si lleváis ratos sin avance, contrastad lo que ya sabéis con la escena. «Pedir pista» en el reto activo entrega ayuda oficial nivel a nivel; yo no sustituyo ese botón.`;
    case "should_request_hint":
      return openId
        ? `Si «${openLabel}» os frustra tras varios intentos honestos, pedid pista: N1 orienta, N2 relaciona y N3 explica enfoque — nunca os diré el código desde aquí.`
        : `Cuando un reto se resista tras probar hipótesis, usad «Pedir pista» en ese panel: es la vía justa de ayuda.`;
    default:
      return `Seguid explorando; la ayuda oficial está en «Pedir pista» del reto activo.`;
  }
}