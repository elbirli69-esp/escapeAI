export function roomThemeLabel(theme?: string): string | null {
  if (theme === "coastal") return "Costa";
  if (theme === "urban") return "Urbano";
  return null;
}