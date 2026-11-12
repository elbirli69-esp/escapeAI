# Prompt: pruebas interactivas (sonido, voz, cámara, visuales)

Brief ejecutado para hacer las experiencias más divertidas en móvil.

**Evolución v2 (OSS + UX):** [prompt-mobile-sensory-puzzles-v2.md](./prompt-mobile-sensory-puzzles-v2.md) · [OSS](./prompt-mobile-puzzles-oss-integrations.md) · QA [qa-mobile-puzzles.md](./qa-mobile-puzzles.md)

## Objetivo

Ampliar el motor con puzzles que usan **hardware del móvil** y **medios enriquecidos**, validados en servidor con las mismas reglas deterministas que `code` / `inventory`.

| Tipo | Hardware | Flujo jugador |
| ---- | -------- | ------------- |
| `sound` | Altavoz | Escuchar clip → deducir código → enviar respuesta |
| `voice` | Micrófono | Decir la frase objetivo (Web Speech API) → validación por transcript |
| `camera` | Cámara | Capturar foto del entorno → introducir palabra clave vista |
| `visual` | Pantalla | Ver imagen (Pexels / URL / fal) → resolver acertijo visual → respuesta |

## Contrato YAML (motor)

Campos opcionales en `RoomPuzzle`:

- **sound**: `audioUrl` **o** `soundMode: beeps` + `beepPattern`, `minListenSec`, `answer`
- **voice**: `answer`, `voiceLocale`, `voiceMatchMode` (`fuzzy`), `allowTextFallback`
- **camera**: `cameraPrompt`, `cameraSynonyms`, `cameraMode`, `answer`
- **visual**: `visualUrl` / `pexelsQuery` / `falPrompt`, `visualLayout`, `pexelsQueryB`, `answer`

Pasos obligatorios antes de `submit_answer` (acción `complete_interaction`):

- sound → `listen` (audio terminado)
- voice → `speak` (reconocimiento ejecutado)
- camera → `capture` (foto tomada)
- visual → `view` (imagen cargada)

## API de medios

| Ruta | Uso |
| ---- | --- |
| `GET /api/media/pexels?q=` | Imagen de stock (`PEXELS_API_KEY`) o fallback curado |
| `POST /api/media/fal-image` | Generación (`FAL_KEY`) o fallback Pexels/texto |

Las claves son opcionales: sin ellas, fallbacks locales/placeholders mantienen la partida jugable.

## Integración eventos

El generador de aventuras personalizadas puede insertar **un puzzle interactivo por acto** (sonido en intro, visual en galería, cámara en recuerdos, voz antes del final).

## Seguridad y privacidad

- Las fotos **no se suben** al servidor en v1: solo se marca `capture` en sesión; la validación es la **palabra clave** acordada en la sala.
- El narrador IA no recibe imágenes ni audio del jugador.

## Sonido en producto genérico

Misma mecánica en todas las ocasiones; solo cambian **datos del wizard**:

| Patrón | `answer` derivado de entradas |
| ------ | ----------------------------- |
| Fragmento numérico (eventos generados) | 2 primeras cifras del código de 4 dígitos (año en `facts` → prioridad) |
| Código completo | Escuchar → escribir 4 cifras o palabra definida en YAML |
| Identificación | SFX + respuesta palabra (salas manuales / laboratorio) |

El organizador no elige el patrón en v1: el **generador** enlaza sonido + candado al mismo pipeline numérico.

## Próximo

- Validación de imagen en servidor (visión) opcional.
- Efectos de sonido generados (Web Audio / fal audio).
- Puzzles por equipo con el mismo `answer` y distinto `audioUrl`/`pexelsQuery`.
