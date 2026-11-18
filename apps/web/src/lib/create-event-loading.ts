import { FetchTimeoutError, isLikelyNetworkError } from "./fetch-json";

/** Tiempo máximo de espera al generar un evento (Pexels + sala en servidor). */
export const CREATE_EVENT_REQUEST_TIMEOUT_MS = 120_000;

const HINT_STAGES: Array<{ afterMs: number; message: string }> = [
  {
    afterMs: 0,
    message: "Generando tu escape con tus datos y plantilla…",
  },
  {
    afterMs: 8_000,
    message: "Estamos montando escenas y pistas personalizadas. No cierres esta pantalla.",
  },
  {
    afterMs: 20_000,
    message: "La red va lenta; el servidor sigue trabajando. Puede tardar hasta un minuto.",
  },
  {
    afterMs: 45_000,
    message: "Casi listo. Mantén la pestaña abierta hasta ver tu código.",
  },
  {
    afterMs: 75_000,
    message: "Sigue generando. Si no termina, podrás reintentar en cuanto pare la carga.",
  },
];

export function createEventLoadingHint(elapsedMs: number): string {
  let hint = HINT_STAGES[0]!.message;
  for (const stage of HINT_STAGES) {
    if (elapsedMs >= stage.afterMs) hint = stage.message;
  }
  return hint;
}

export function mapCreateEventClientError(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof FetchTimeoutError) {
    return {
      message:
        "Tardó más de lo esperado. Comprueba la conexión y pulsa «Reintentar» (no hace falta rellenar de nuevo).",
      retryable: true,
    };
  }
  if (isLikelyNetworkError(err)) {
    return {
      message: "No pudimos hablar con el servidor. Revisa la red o el Wi‑Fi y vuelve a intentarlo.",
      retryable: true,
    };
  }
  if (err instanceof Error) {
    const validation =
      /no válido|mínimo|Indica|Añade|Revisa/i.test(err.message) && !/servidor|conexión|tardó/i.test(err.message);
    return { message: err.message, retryable: !validation };
  }
  return { message: "No se pudo crear el evento.", retryable: true };
}