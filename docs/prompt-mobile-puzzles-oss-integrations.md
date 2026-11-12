# Open source — puzzles sensoriales EscapeAI

Estado alineado con **PR #19** (P0 integrado vía npm; no hay repos clonados en el monorepo).

## Integrado (P0)

| Librería | npm | Responsabilidad | Motor |
| -------- | --- | --------------- | ----- |
| Tone.js | `tone` | Beeps (`soundMode: beeps`) | Solo cliente; `complete_interaction: listen` en servidor |
| Howler.js | `howler` | Audio por URL | Igual |
| react-webcam | `react-webcam` | Preview y captura local JPEG | `capture` sin subir imagen |
| react-zoom-pan-pinch | `react-zoom-pan-pinch` | Zoom táctil en visuales | `view` en servidor |
| `answer-match.ts` | `@escapeai/shared` | Normalización, fuzzy voz, sinónimos, dígitos ES | `escape-engine` usa las mismas reglas |

**Privacidad:** fotos y audio no se envían al API. Web Speech API puede usar servicios del navegador (no offline).

**Bundle (aprox.):** JS principal ~535 kB gzip ~153 kB (Tone/Howler en chunk separado de beeps vía `import()` dinámico del player).

## Planificado P1 (no implementado)

| Librería | Uso previsto | Estrategia |
| -------- | ------------ | ---------- |
| tesseract.js | OCR `cameraMode: ocr_hint` | `import()` + modelos en `public/models/` |
| vosk-browser | Fallback STT offline | Lazy + modelo ES bajo demanda |
| react-compare-image | Visual dual | Solo si `visualLayout: dual` |

## Servicios externos (no OSS de puzzles)

- Pexels / fal.ai — imágenes en `apps/api/src/media-routes.ts`
- DeepSeek — narrador; no recibe foto ni audio del jugador

## Contrato

Validación determinista solo en motor (`submit_answer` + `matchPlayerAnswer`). El cliente no decide si la respuesta es correcta.

Ver también: [qa-mobile-puzzles.md](./qa-mobile-puzzles.md), [prompt-interactive-challenges.md](./prompt-interactive-challenges.md).
