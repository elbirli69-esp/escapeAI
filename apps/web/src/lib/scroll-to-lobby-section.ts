/** Lleva la vista al bloque de formulario del lobby tras elegir una tarjeta o modo. */
export function scrollToLobbySection(
  elementId: string,
  options?: { focusSelector?: string },
): void {
  const el = document.getElementById(elementId);
  if (!el) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

  if (!options?.focusSelector) return;
  window.setTimeout(() => {
    const focusable = el.querySelector<HTMLElement>(options.focusSelector!);
    focusable?.focus({ preventScroll: true });
  }, reduced ? 0 : 320);
}