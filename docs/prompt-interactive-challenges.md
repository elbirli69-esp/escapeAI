# Prompt: pruebas interactivas (sonido, voz, cámara, visuales)

Brief ejecutado para hacer las experiencias más divertidas en móvil.

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

- **sound**: `audioUrl`, `answer`
- **voice**: `answer` (frase), `voiceLocale` (default `es-ES`)
- **camera**: `cameraPrompt`, `answer`
- **visual**: `visualUrl` **o** `pexelsQuery` (cliente resuelve vía API), `answer`

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

## Próximo

- Validación de imagen en servidor (visión) opcional.
- Efectos de sonido generados (Web Audio / fal audio).
- Puzzles por equipo con el mismo `answer` y distinto `audioUrl`/`pexelsQuery`.
