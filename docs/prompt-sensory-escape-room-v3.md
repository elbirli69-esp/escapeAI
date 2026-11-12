# PROMPT — Sensory escape room v3 (misterio + rompecabezas hilados)

**Rol:** diseñador senior de escape rooms digitales + arquitecto técnico escapeAI.  
**Objetivo:** más tensión narrativa, pistas que se cruzan entre estaciones, y uso deliberado de altavoz, micrófono, cámara, GPS y pantalla — sin romper el motor determinista ni la privacidad (nada de subir foto/audio al servidor en v3.0).

**Referencias:** [prompt-mobile-sensory-puzzles-v2.md](./prompt-mobile-sensory-puzzles-v2.md), [prompt-mobile-puzzles-oss-integrations.md](./prompt-mobile-puzzles-oss-integrations.md), [product-generic-experiences.md](./product-generic-experiences.md).

---

## Diagnóstico (experiencia ER hoy)

| Sentido | Qué hay | Falta de “escape room” |
| -------- | ------- | ------------------------ |
| **Altavoz** | Beeps en lab; eventos con MP3 ambiente fijo | Pista audible **no coincide** con solución; sin variación por evento; sin hilo “escuchaste X → candado Y” |
| **Micrófono** | Apodo fuzzy + fallback texto | Sin códigos dichos en voz, sin “contraseña del NPC”, sin eco con sonido |
| **Cámara** | Foto + OCR demo; evento = apodo | Sin conteo ni búsqueda de color; foto no alimenta el código numérico |
| **GPS** | Solo `geo-lab` | Eventos sin rally; sin “ruta” multi-waypoint; sin GPS+código mezclado |
| **Visual** | Pexels/Fal, dual compare | Imagen no es “mapa” ni “parte de código”; poca narrativa entre escenas |

**Principio ER:** cada estación debe **dar algo jugable** (cifra, letra, orden, lugar) que **otra cerradura consume** explícitamente en el texto de sala.

---

## Mejoras por ámbito (diseño + librerías)

### 1. Altavoz (`sound`)

| Mejora | Mecánica | Librerías / stack |
| ------ | -------- | ----------------- |
| **P1 ✓ (ejecutar)** | Variantes procedurales: TTS en español + patrones beep por dígito; elección estable por `eventId` | Web Speech API (0 €); Tone.js / Howler (ya) |
| **P1.5** | Banco SFX cortos (llave, radio, estática) bajo la voz | Pixabay CDN (ya), opcional [Freesound API](https://freesound.org/docs/api/) con clave |
| **P2** | Dos pistas en un puzzle: clip ambiente + overlay TTS | Howler sprites |
| **P2** | Dígitos en Morse audible (no solo contar beeps) | Tone.js secuencia |
| **P3** | Voz IA premium | ElevenLabs / OpenAI TTS (API + coste) |
| **Hilo** | `sound_intro` → 2 cifras → `entry_lock` (4); narrativa: “La radio confirmó el prefijo” | Solo YAML + `interactionHints` |

### 2. Micrófono (`voice`)

| Mejora | Mecánica | Librerías |
| ------ | -------- | --------- |
| **P1** | `voiceMatchMode: digits` — “uno nueve ocho cero” → `1980` | Motor (ya) + mapa ES |
| **P1** | Frase que **repite** lo escuchado en sonido (“repite el prefijo”) | Contenido generador |
| **P2** | Offline consistente en fiesta ruidosa | vosk-browser (ya) |
| **P2** | “Todos dicen una sílaba” (equipo) | UI + validación fuzzy amplia |
| **Hilo** | `voice_seal` solo abre si `final_code` casi resuelto (condición escena) | Condiciones YAML |

### 3. Cámara (`camera`)

| Mejora | Mecánica | Librerías |
| ------ | -------- | --------- |
| **P1** | `count` + `keyword` en eventos generados (no solo apodo) | react-webcam (ya) |
| **P1** | OCR extrae dígito → 3ª cifra del candado (parcial) | Tesseract.js lazy (ya) |
| **P2** | Sinónimos por color/forma en YAML | Motor answer-match |
| **P3** | Comparar foto con referencia (cliente) | tfjs / pixelmatch (pesado) |
| **Hilo** | Foto de objeto citado en `facts[0]` → palabra que aparece en visual `pexelsQuery` | Redacción generador |

### 4. GPS (`location`)

| Mejora | Mecánica | Librerías |
| ------ | -------- | --------- |
| **P1** | 1 waypoint en eventos outdoor: lat/lon del organizador o POI en `facts` | Geolocation + Haversine (ya) |
| **P2** | Cadena A→B: salir de escena 1 solo tras `reach` A | Escenas + exits |
| **P2** | Quiz “¿qué calle?” con `quizPrompt` ligado al waypoint | YAML |
| **P3** | Indoor: QR con coordenadas fijas (sin GPS) | Nuevo tipo opcional `qr_checkin` |
| **Hilo** | Coords revelan **orden** de letras del `final_code` | Narrativa |

### 5. Visual + narrativa global

| Mejora | Mecánica | Librerías |
| ------ | -------- | --------- |
| **P1** | `interactionHints` en todos los puzzles sensoriales | Ya en modelo |
| **P1** | Imagen con “detalle oculto” (dual compare obligatorio en misterio) | react-compare-image (ya) |
| **P2** | Temas visuales por `adventureType` (ya parcial en UI) | `room-ambience`, Fal/Pexels |
| **P2** | Carta del organizador: PDF con mapa (blob) | Generador PDF |
| **Hilo** | Visual da **longitud** → voz da **palabra** → letras del final | Generador |

---

## Rompecabezas hilados (plantilla evento 3 actos)

```
ACTO 1 — Convocatoria
  sound_intro  → respuesta: 2 primeras cifras de CNUM
  entry_lock   → respuesta: CNUM (4 cifras); exit a acto 2

ACTO 2 — Sala + objeto
  camera_hunt  → palabra-clave del apodo / fact
  token_slot   → inventario; exit a acto 3

ACTO 3 — Cierre
  visual_gallery → número (letras del apodo)
  voice_seal     → apodo hablado (atmósfera)
  final_code     → LETRAS (iniciales del nombre)
```

**Reglas de redacción:** cada `prompt` menciona qué puzzle anterior dio qué (sin spoilear la solución completa).

---

## Plan de ejecución para agente

### Fase A — Hecho en esta PR (P0/P1)

- [x] Prompt este documento.
- [x] `sound-digit-clues.ts`: variantes TTS + beeps por evento; integrar en `generate-adventure`.
- [x] UI `soundMode: tts` con Web Speech.
- [x] Validación YAML `tts` + `ttsText`.
- [x] `interactionHints` en puzzles sensoriales del generador.

### Fase B — Siguiente sprint

- [ ] GPS opcional en generador si `facts` incluye lat/lon o ciudad conocida.
- [ ] Cámara `ocr_hint` en evento: 3ª cifra de CNUM.
- [ ] Voice `digits` en puzzle intermedio.
- [ ] Sala catálogo `mystery-chain.yaml` de demostración hilada.

### Fase C — Contenido / APIs

- [ ] Rotación pool Pixabay/Freesound por `teamSlot`.
- [ ] Autoría: guía “cómo escribir un hilo sensorial” en `authoring-rooms.md`.

---

## Criterios de aceptación

1. Dos eventos con mismos datos pero distinto `eventId` pueden tener **distinto modo sonido** (TTS vs beeps) y **distinto guion**, misma respuesta de 2 cifras.
2. TTS suena en Chrome Android tras pulsar reproducir (o fallback beeps si no hay voz).
3. Tests unitarios de variantes deterministas; Playwright sigue verde.
4. Ningún audio/foto subido al API en flujos nuevos.

---

## Comando verificación

```bash
pnpm -r test && pnpm test:e2e
```
