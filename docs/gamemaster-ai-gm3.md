# GameMasterAI — GM-3: Personajes conversacionales

**Depende de:** GM-1 + GM-2 en `main`.

## Alcance

1. **Contenido YAML** — `characters` en sala; `characters[]` por escena (`pilot`: conserje nocturno).
2. **Motor** — acción `talk_to_character`; evento `character_talk`; `PublicState.sceneCharacters`.
3. **GM** — trigger `CHARACTER_TURN` (LLM opcional con contexto acotado o fallback estático).
4. **PWA** — panel «Hablar» con input; respuestas en diario con etiqueta Personaje.

## Contratos

| Pieza | Detalle |
|-------|---------|
| `RoomCharacter` | `authorizedKnowledge`, `forbiddenTopics`, `fallbackLines`, `greeting` |
| `GmViewContext` | `activeCharacter*`, `playerUtterance` (sin respuestas del room) |
| `NarrativeIntervention` | `kind: "character"`, `characterId` |

## Límites

| Env | Default |
|-----|---------|
| `GM_MAX_CHARACTER_LLM` | 30 |
| `GM_CHARACTER_COOLDOWN_MS` | 2000 |

## Fuera de alcance

- TTS / voces (GM-4).
- `talk_to_character` en salas generadas por evento (sin fichas aún).
- Personajes con estado propio en el motor.
