export const ASYMMETRIC_PLAYER_ROLES = ["researcher", "field"] as const;
export type PlayerRoleId = (typeof ASYMMETRIC_PLAYER_ROLES)[number];

export const PLAYER_ROLE_LABELS: Record<PlayerRoleId, string> = {
  researcher: "Investigador/a (laboratorio)",
  field: "Campo (muestras)",
};

export function isPlayerRoleId(value: string): value is PlayerRoleId {
  return (ASYMMETRIC_PLAYER_ROLES as readonly string[]).includes(value);
}

export const ASYMMETRIC_COOP_BANNER =
  "Comparte con tu equipo lo que veas en pantalla: cada rol tiene pistas distintas.";