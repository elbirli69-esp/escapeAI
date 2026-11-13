import type { NarrativeIntervention, PublicCharacter } from "@escapeai/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { speakWithWebSpeech } from "../lib/speech-tts";
import { prefersReducedSensory } from "../lib/room-ambience";

const STORAGE_KEY = "escapeai.gm-tts";

function readGmTtsPref(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function useGmSpeech(
  interventions: NarrativeIntervention[],
  sceneCharacters?: PublicCharacter[],
) {
  const [enabled, setEnabled] = useState(readGmTtsPref);
  const armed = useRef(false);
  const lastSpokenId = useRef<string | null>(null);

  const armFromGesture = useCallback(() => {
    if (prefersReducedSensory()) return;
    armed.current = true;
  }, []);

  useEffect(() => {
    if (!enabled || !armed.current || prefersReducedSensory()) return;
    const latest = [...interventions]
      .filter((i) => i.presentation === "tts")
      .sort((a, b) => b.sequence - a.sequence || b.createdAt - a.createdAt)[0];
    if (!latest || latest.id === lastSpokenId.current) return;
    lastSpokenId.current = latest.id;
    const cid = latest.characterId;
    const locale =
      (cid && sceneCharacters?.find((c) => c.id === cid)?.voiceLocale) ?? "es-ES";
    void speakWithWebSpeech(latest.text, locale).catch(() => undefined);
  }, [interventions, enabled, sceneCharacters]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleGmTts = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
      if (!next && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
    armFromGesture();
  }, [armFromGesture]);

  return {
    gmTtsOn: enabled && !prefersReducedSensory(),
    toggleGmTts,
    armGmSpeech: armFromGesture,
  };
}
