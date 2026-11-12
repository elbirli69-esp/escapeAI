/** URL de la PWA con código de evento para escaneo con cámara. */
export function buildEventJoinUrl(joinCode: string): string {
  if (typeof window === "undefined") return `/?join=${joinCode.toUpperCase()}`;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("join", joinCode.trim().toUpperCase());
  return url.toString();
}

export function readJoinCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("join")?.trim().toUpperCase();
  if (!raw || raw.length < 4) return null;
  return raw;
}

export function stripJoinParamFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("join")) return;
  url.searchParams.delete("join");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
