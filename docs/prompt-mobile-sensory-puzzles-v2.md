# TAREA — Pruebas sensoriales en móvil (v2)

Prompt para agente / desarrollo. Parte del brief ya ejecutado en [prompt-interactive-challenges.md](./prompt-interactive-challenges.md). **P0 en `main` (PR #19):** OSS integrado, `answer-match`, lab sensorial, review correctiva. **Pendiente:** variantes avanzadas del catálogo, P1 OCR/STT lazy.

**Stack OSS recomendado:** ver [prompt-mobile-puzzles-oss-integrations.md](./prompt-mobile-puzzles-oss-integrations.md) (Howler/Tone, react-webcam, Tesseract lazy, zoom pinch, fuzzy en motor, etc.).

## Objetivo

Convertir los puzzles interactivos de **demostración técnica** en **pruebas de escape room jugables en fiesta** (2–5 equipos, 1 móvil por equipo), con UX clara, permisos robustos, variantes de diseño y contenido procedural rico — **sin romper** el motor determinista ni el modelo eventos/equipos.

## Principios (diseño escape room + móvil)

1. **Un sentido por puzzle** — altavoz, micrófono, cámara o pantalla; no mezclar dos hardware en el mismo nodo.
2. **Escuchar / ver / capturar antes de responder** — los pasos `listen` | `speak` | `capture` | `view` se mantienen; la UI debe hacer obvio qué falta.
3. **Privacidad por defecto** — fotos y audio del jugador **no suben** al servidor en v2.0; validación por palabra/código acordado en sala (v2.1 opcional: visión en servidor con opt-in).
4. **Funciona en sala ruidosa** — siempre alternativa: escribir respuesta si falla micrófono; botón “Ya escuché” solo tras ≥N segundos de reproducción (anti-skip suave, no bloqueante).
5. **Genérico por ocasión** — mismos tipos de puzzle; cambian textos, medios y respuestas derivadas del wizard (`facts`, `subject`, `adventureType`).
6. **Equipos en paralelo** — mismo `answer` para todos; opcional variar `audioUrl` / `pexelsQuery` por `teamSlot` (colores/equipos) sin cambiar solución.

## Catálogo de pruebas (implementar contenido + UI)

### Altavoz (`sound`)

| Variante | Mecánica | Respuesta | Notas UX |
| -------- | -------- | --------- | -------- |
| **Morse / tonos** | Secuencia de beeps (Web Audio o MP3) | 2 dígitos o palabra | Barra de progreso de escucha |
| **Fragmento numérico** | Voz TTS o clip “las cifras son…” | Primeras 2 cifras del código de evento | Ya enlazado en generador |
| **Eco espacial** | Dos clips; segunda con filtro | Diferencia (par/impar, sí/no) | Modo “repetir último” |
| **Canción / ambient** | loop corto royalty-free | Contar golpes o leer pista en narrativa | Volumen y vibración al completar `listen` |

**Datos nuevos sugeridos en YAML:** `soundMode?: "url" | "beeps" | "tts"`; `beepPattern?: number[]` (ms on/off); `ttsText?: string`; `minListenSec?: number` (default 3).

### Micrófono (`voice`)

| Variante | Mecánica | Validación |
| -------- | -------- | ---------- |
| **Contraseña hablada** | Decir frase del prompt | Normalizar + fuzzy (quitar tildes, distancia Levenshtein ≤1) en cliente **y** motor |
| **Código digitado en voz** | “uno dos tres cuatro” | Mapa números ES → dígitos |
| **Efecto de grupo** | Todos del equipo dicen una palabra (un móvil) | Palabra única |
| **Fallback** | Sin Web Speech | Campo texto “Escribe lo que dirías” |

**Datos:** `voiceTarget?: string` (además de `answer`); `voiceMatchMode?: "exact" | "fuzzy" | "digits"`; `allowTextFallback?: boolean` (default true).

### Cámara (`camera`)

| Variante | Mecánica | Validación v2.0 |
| -------- | -------- | --------------- |
| **Búsqueda simbólica** | Foto de objeto con forma/color del prompt | Jugador escribe qué fotografió; comparar con `answer` / sinónimos |
| **Conteo** | “Fotografía N objetos iguales” | Respuesta numérica |
| **Escaneo de pista** | Foto de cartel/papel con texto impreso | OCR en cliente (Tesseract.js opcional) → extraer dígitos |
| **Selfie equipo** | Foto del grupo | Honorífico; `answer` fijo “EQUIPO” o palabra del evento |

**Datos:** `cameraMode?: "keyword" | "count" | "ocr_hint"`; `cameraSynonyms?: string[]`; `requireEnvironmentCamera?: boolean`.

**UX obligatoria:** permisos explicados, `facingMode` trasera por defecto, reintentar, ver miniatura, revocar stream al salir.

### Pantalla / visual (`visual`)

| Variante | Mecánica | Fuente |
| -------- | -------- | ------ |
| **Diferencias** | Dos imágenes (Pexels query A/B) | Qué cambia (color, número) |
| **Esteganografía simple** | Imagen fal/Pexels + pista en `prompt` | Contar elementos |
| **Mapa / diagrama** | SVG o imagen fija en content | Orden de símbolos → código |
| **Generativa** | `falPrompt` desde hechos del evento | Misma respuesta determinista post-`view` |

**Datos:** `visualLayout?: "single" | "dual" | "hotspot"` (hotspots = fase posterior); `pexelsQueryB?: string`.

## Contrato técnico (packages)

### `packages/shared`

- Ampliar `PublicPuzzle` con campos opcionales de presentación (sin secretos): `soundMode`, `minListenSec`, `voiceMatchMode`, `cameraMode`, `allowTextFallback`, `interactionHints?: string[]`.
- Mantener `InteractionStep` actual; si hace falta `replay` como paso interno del cliente, **no** persistir en servidor.

### `packages/escape-engine` / `room-definition.ts`

- Validar nuevos campos en puzzles interactivos.
- **Voz:** en `submit_answer`, si `type === voice` y `voiceMatchMode === fuzzy`, aplicar misma normalización que el cliente.
- **Sonido:** si `soundMode === beeps`, no exigir `audioUrl` (validación en `validate-rooms.ts`).

### `packages/escape-content`

- Enriquecer `generate-adventure.ts`: por `adventureType`, elegir **variante** de cada acto (tabla determinista hash de `eventId`).
- Ampliar `rooms/interactive-lab.yaml` como **laboratorio** con una variante de cada tipo.
- Añadir `rooms/assets/audio/` (clips cortos CC0 o beeps generados) referenciados por URL estática del web build.

### `apps/web` — `InteractivePuzzle.tsx` + estilos

Dependencias OSS (detalle en [oss-integrations](./prompt-mobile-puzzles-oss-integrations.md)):

| Station | Librerías P0 | Lazy P1 |
| ------- | ------------- | ------- |
| Sound | **Tone.js** (`beeps`) o **Howler.js** (MP3/sprites) | — |
| Voice | Web Speech + **fastest-levenshtein** + **diacritics** | **vosk-browser** |
| Camera | **react-webcam** | **tesseract.js** (`ocr_hint`) |
| Visual | **react-zoom-pan-pinch**; **react-compare-image** si `visualLayout: dual` | — |

- **SoundStation:** Tone/Howler según `soundMode`; contador `minListenSec`; vibración opcional al `listen`.
- **VoiceStation:** fuzzy en cliente; motor con misma normalización; fallback texto; lazy Vosk si Web Speech falla.
- **CameraStation:** react-webcam (`facingMode`), galería como fallback; OCR en worker solo en `cameraMode: ocr_hint`.
- **VisualStation:** pinch/zoom o compare slider; marcar `view` tras ≥2s visible o interacción zoom.
- Componente común **`PermissionGate`** (cámara/mic) con copy en español y enlace a ajustes.
- **PWA:** probar Safari iOS + Chrome Android; documentar limitaciones en UI si el navegador no soporta speech.
- **Bundle:** `import()` dinámico para tesseract/vosk; no COOP/COEP global en Vercel salvo experimento Whisper.

### `apps/api`

- Sin almacenar imágenes en v2.0.
- Opcional v2.1: `POST /api/media/vision-check` (FAL/OpenAI vision) detrás de flag `ALLOW_VISION_UPLOAD=false` por defecto — **no obligatorio en esta tarea**.

### Medios

- Ampliar `media-routes.ts`: `GET /api/media/tts?text=` (Edge TTS o fallback cliente) para puzzles sound sin archivo.
- Catálogo local de beeps (sin dependencia externa).

## Integración eventos (equipos 2–5)

- Al crear sesión de evento, pasar `teamSlot` al estado público si aún no está.
- Generador: `audioUrl` / `pexelsQuery` rotados por slot (`hash(eventId + slot) % n`).
- Organizador: en preview del evento, listar **tipos** de pruebas incluidas (iconos: 🔊🎤📷🖼️), no las soluciones.

## Criterios de aceptación

1. `pnpm test` y `pnpm build` verdes en monorepo.
2. Partida completa en **`interactive-lab`** resolviendo los 4 tipos con hardware real (o mocks en test).
3. Partida **evento generado** (`celebration` / `mystery` / `team`) con al menos 3 interactivos distintos y códigos coherentes con `facts`.
4. Sin regresión: puzzles `code` / `inventory` y flujo equipos + leaderboard.
5. Documentación: actualizar [prompt-interactive-challenges.md](./prompt-interactive-challenges.md) con enlace a v2 y tabla de variantes.
6. Manual QA checklist en `docs/qa-mobile-puzzles.md` (nuevo, corto).

## Plan de implementación (orden recomendado)

0. **OSS P0** — añadir deps web (`howler`, `tone`, `react-webcam`, `react-zoom-pan-pinch`); fuzzy en `escape-engine` (sin arrastrar howler al motor).
1. **Shared + engine** — tipos, validación, fuzzy voice, `beep` sin `audioUrl`.
2. **Web UX** — PermissionGate; stations con librerías anteriores; lazy tesseract/vosk.
3. **Contenido** — lab YAML + assets audio (CC0/Kenney) + generador con variantes.
4. **OSS P1** — puzzle `ocr_hint` en lab; toggle feature `voiceOffline` con modelo ES en `public/models/`.
5. **QA doc + tests** — `docs/qa-mobile-puzzles.md`; tests motor fuzzy/digits; checklist permisos iOS/Android.

## Tests mínimos

- Engine: voice fuzzy acepta “habitacion” / “habitación”; digits “uno dos tres cuatro” → `1234`.
- Engine: `complete_interaction` listen sigue bloqueando submit hasta step completado.
- Content: `validate-rooms` acepta sound beep sin `audioUrl`.
- Generator: mismo `eventId` → mismas variantes; distinto slot → distinta `pexelsQuery` si configurado.

## Fuera de alcance (v3+)

- Subida de foto al servidor para verificación IA.
- Multijugador tiempo real en un puzzle.
- AR / geolocalización.
- Editor visual de hotspots en organizador.

---

## Prompt corto (copiar y pegar en agente)

```
TAREA — EscapeAI: mejora v2 puzzles sensoriales móvil (altavoz, micrófono, cámara, pantalla).

Contexto: monorepo pnpm (@escapeai/shared, escape-engine, escape-content, apps/api Hono, apps/web React PWA). Ya existen tipos sound/voice/camera/visual, complete_interaction, InteractivePuzzle.tsx, generate-adventure.ts, eventos por equipos.

Objetivo: UX y contenido de nivel fiesta/escape room. Leer:
- docs/prompt-mobile-sensory-puzzles-v2.md (variantes, contrato, criterios)
- docs/prompt-mobile-puzzles-oss-integrations.md (OSS P0: tone/howler, react-webcam, react-zoom-pan-pinch, fastest-levenshtein; P1 lazy: tesseract.js, vosk-browser)

Integrar OSS según prioridad P0; code-split P1; misma fuzzy/normalize en web y escape-engine; sin subir fotos al servidor.

Entrega: PR cursor/mobile-sensory-puzzles-v2-77f8, tests verdes, docs/qa-mobile-puzzles.md, actualizar prompt-interactive-challenges.md.

Criterios: partida interactive-lab + evento generado; sin regresión code/inventory/equipos; build+test OK; bundle inicial sin modelos Vosk/Tesseract.
```
