import { useCallback, useEffect, useRef, useState } from "react";
import {
  prefersReducedSensory,
  startRoomAmbience,
  stopRoomAmbience,
} from "../lib/room-ambience";

const STORAGE_KEY = "escapeai.ambience";

function readAmbiencePref(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function useRoomAmbience(theme: string | undefined, playing: boolean) {
  const [enabled, setEnabled] = useState(readAmbiencePref);
  const armed = useRef(false);

  const sync = useCallback(async () => {
    if (!playing || !enabled || !armed.current) {
      await stopRoomAmbience();
      return;
    }
    await startRoomAmbience(theme);
  }, [enabled, playing, theme]);

  useEffect(() => {
    void sync();
    return () => {
      void stopRoomAmbience();
    };
  }, [sync]);

  const armFromGesture = useCallback(() => {
    if (prefersReducedSensory()) return;
    armed.current = true;
    void sync();
  }, [sync]);

  const setAmbience = useCallback(
    (on: boolean) => {
      setEnabled(on);
      localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
      if (on) armed.current = true;
      void sync();
    },
    [sync],
  );

  const toggle = useCallback(() => {
    setAmbience(!enabled);
  }, [enabled, setAmbience]);

  return {
    ambienceOn: enabled && !prefersReducedSensory(),
    armFromGesture,
    toggleAmbience: toggle,
    reducedMotion: prefersReducedSensory(),
  };
}
