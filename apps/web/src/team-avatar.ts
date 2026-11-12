export function teamAvatarStyle(teamName: string): { initials: string; background: string } {
  const parts = teamName.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
      : (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  let hash = 0;
  for (const ch of teamName) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const hue = hash % 360;
  return {
    initials,
    background: `hsl(${hue} 52% 42%)`,
  };
}
