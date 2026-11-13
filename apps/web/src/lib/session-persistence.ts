const SESSION_ID_KEY = "escapeai.sessionId";
const ROOM_ID_KEY = "escapeai.roomId";
const AUTO_RESUME_KEY = "escapeai.autoResume";

export function readStoredSessionId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SESSION_ID_KEY);
}

export function readStoredRoomId(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ROOM_ID_KEY);
}

export function shouldAutoResumeSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(AUTO_RESUME_KEY) === "1";
}

export function markSessionActiveForAutoResume(): void {
  try {
    sessionStorage.setItem(AUTO_RESUME_KEY, "1");
  } catch {
    /* quota / private mode */
  }
}

export function clearAutoResumeMark(): void {
  try {
    sessionStorage.removeItem(AUTO_RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredSessionKeys(): void {
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(ROOM_ID_KEY);
  localStorage.removeItem("escapeai.eventCode");
  localStorage.removeItem("escapeai.teamId");
  clearAutoResumeMark();
}
