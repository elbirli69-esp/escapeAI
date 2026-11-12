# Open source reutilizable — pruebas sensoriales EscapeAI

Catálogo de proyectos **compatibles con nuestro stack** (React 18, Vite PWA, Hono/Vercel, privacidad en cliente). Referencia para [prompt-mobile-sensory-puzzles-v2.md](./prompt-mobile-sensory-puzzles-v2.md).

## Estado en `main` (tras PR #19)

| Componente | Estado |
| ---------- | ------ |
| Tone.js (beeps) | Integrado; chunk lazy vía `import("./lib/beep-player")` |
| Howler.js | Integrado |
| react-webcam / react-zoom-pan-pinch | Integrado |
| Fuzzy / sinónimos | `packages/shared/src/answer-match.ts` (sin npm `fastest-levenshtein`) |
| tesseract.js (lazy OCR) | `import()` en captura; pista local |
| vosk-browser (lazy STT) | Botón «Modo offline»; chunk ~6 MB no precacheado |
| react-compare-image | `visualLayout: dual` en lab |

**Bundle (build producción web):** entry ~308 kB (~94 kB gzip) + chunk Tone ~229 kB al reproducir beeps.

**Privacidad:** fotos y audio no van al API. Web Speech puede usar nube del navegador (no offline).

## Criterios de selección

| Criterio | Por qué |
| -------- | ------- |
| **Licencia permisiva** | MIT / BSD / Apache-2.0 preferidos; AGPL/GPL solo si no enlazan el monorepo (evitar). |
| **100 % cliente o lazy-load** | Fiesta = muchos móviles; modelos pesados solo bajo demanda (`import()` + cache). |
| **HTTPS + móvil** | Safari iOS y Chrome Android; alternativa si falla (texto manual). |
| **Determinismo** | El motor sigue validando `answer`; OSS solo enriquece captura/UX, no la solución secreta. |
| **Mantenedor activo o estándar de facto** | Evitar wrappers abandonados (p. ej. empaquetados “camera+OCR” sin commits recientes). |

## Mapa por tipo de puzzle

| Tipo | Proyecto OSS | Repo / npm | Licencia | Uso en EscapeAI | Prioridad |
| ---- | ------------ | ---------- | -------- | --------------- | --------- |
| **Altavoz** | [Howler.js](https://github.com/goldfire/howler.js) | `howler` | MIT | Clips, sprites, volumen, iOS tras gesto usuario | **P0 ✓** |
| **Altavoz** | [Tone.js](https://github.com/Tonejs/Tone.js) | `tone` | MIT | Beeps (`soundMode: beeps`) | **P0 ✓** |
| **Voz** | Web Speech API | nativo | — | Reconocimiento en cliente | **P0 ✓** |
| **Voz** | `answer-match.ts` | `@escapeai/shared` | — | Fuzzy/dígitos/sinónimos; motor autoritativo | **P0 ✓** |
| **Voz** | [vosk-browser](https://github.com/ccoreilly/vosk-browser) | `vosk-browser` | Apache-2.0 | STT offline; modelo ES ~35–50 MB | **P1** |
| **Cámara** | [react-webcam](https://github.com/mozmorris/react-webcam) | `react-webcam` | MIT | Preview y captura local | **P0 ✓** |
| **Cámara** | [Tesseract.js](https://github.com/naptha/tesseract.js) | `tesseract.js` | Apache-2.0 | OCR `cameraMode: ocr_hint` | **P1** |
| **Visual** | [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) | `react-zoom-pan-pinch` | MIT | Pinch/zoom | **P0 ✓** |
| **Visual** | [react-compare-image](https://github.com/ohansemmanuel/react-compare-image) | `react-compare-image` | MIT | Dual visual | **P1** |
| **Voz** | [browser-whisper](https://github.com/tanpreetjolly/browser-whisper) / Parakeet | varios | MIT | Referencia; pesado para PWA fiesta | **P2** |

### No integrar como dependencia (solo inspiración)

| Proyecto | Motivo |
| -------- | ------ |
| [Obvix](https://github.com/Eswarchinthakayala-webdesign/Obvix) | App completa TF+MediaPipe; demasiado peso |
| Escape-room engines genéricos | No encajan con motor YAML determinista |

### Servicios externos (no OSS de puzzles)

| Servicio | Rol |
| -------- | --- |
| Pexels API | Stock `visual` |
| fal.ai | Imágenes generativas |
| DeepSeek | Narrador (sin foto/audio del jugador) |

## Arquitectura de integración

```
InteractivePuzzle.tsx
  ├─ SoundStation    → Howler | import(Tone beeps)
  ├─ VoiceStation    → Web Speech → submit_answer (motor valida)
  │                    └─ P1: vosk-browser lazy
  ├─ CameraStation   → react-webcam (JPEG local)
  │                    └─ P1: Tesseract lazy
  └─ VisualStation   → react-zoom-pan-pinch
         │ complete_interaction     │ submit_answer
         ▼                          ▼
   escape-engine + matchPlayerAnswer (shared)
```

- **Code-splitting P1:** `tesseract.js` y `vosk-browser` con `import()` al entrar al puzzle.
- **Vercel:** evitar COOP/COEP global salvo experimento Whisper.

## Referencias de código

| Área | Archivo |
| ---- | ------- |
| UI interactiva | `apps/web/src/InteractivePuzzle.tsx` |
| Matching | `packages/shared/src/answer-match.ts` |
| Motor | `packages/escape-engine/src/session.ts` |
| Lab | `packages/escape-content/rooms/interactive-lab.yaml` |

Ver también: [qa-mobile-puzzles.md](./qa-mobile-puzzles.md), [prompt-interactive-challenges.md](./prompt-interactive-challenges.md).
