import { useEffect, useState } from "react";

/** Segundos transcurridos mientras `active` es true; se reinicia al desactivar. */
export function useElapsedMsWhile(active: boolean, tickMs = 400): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const started = Date.now();
    setElapsedMs(0);
    const id = window.setInterval(() => setElapsedMs(Date.now() - started), tickMs);
    return () => window.clearInterval(id);
  }, [active, tickMs]);

  return elapsedMs;
}