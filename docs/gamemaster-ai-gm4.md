# GameMasterAI — GM-4: Voz en cliente (TTS)

**Depende de:** GM-3 en `main`.

## Alcance

1. **`presentation: "tts"`** — sustituye `tts_future`; respuestas de personaje con `spokenReplies` (o `voiceTone`) marcan intervención TTS.
2. **Contenido** — `spokenReplies`, `voiceLocale` en `RoomCharacter`; pilot conserje con `es-ES`.
3. **PWA** — hook `useGmSpeech` + Web Speech API (`speech-tts.ts`); toggle *Voz personajes* (localStorage `escapeai.gm-tts`).
4. **Accesibilidad** — respeta `prefersReducedSensory`; requiere gesto del jugador antes de hablar (como ambiente).

## Fuera de alcance

- TTS servidor / ElevenLabs (fase P3 puzzles).
- Voces del Director narrativo (solo personajes en GM-4).
