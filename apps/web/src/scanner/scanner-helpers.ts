export function newObjectIdFromClient(): string {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export { categoryDisplayName, defaultLabelForCategory } from "@escapeai/shared";
