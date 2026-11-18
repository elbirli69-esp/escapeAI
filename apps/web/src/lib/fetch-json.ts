export class FetchTimeoutError extends Error {
  constructor(message = "La solicitud ha tardado demasiado.") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export function isLikelyNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return false;
}

/** `fetch` con límite de tiempo; lanza `FetchTimeoutError` si vence el plazo. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 60_000, signal: outerSignal, ...rest } = init;
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", onOuterAbort);

  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted && !outerSignal?.aborted) {
      throw new FetchTimeoutError();
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}