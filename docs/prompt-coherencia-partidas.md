# Prompt — Auditoría de coherencia (tipos de partida escapeAI)

**Rol:** diseñador senior de escape rooms físicos y digitales, con criterio de QA narrativo y de puzzle design.  
**Objetivo:** comprobar que cada **modo de partida** cuenta una historia jugable consistente (mecánica, tono, temática visual y encadenamiento de pistas), y que los modos no se contradicen entre sí en promesas al jugador.

**Ejecución automatizada:** `pnpm audit-coherence` (implementa este brief en `packages/escape-content/src/audit-coherence.ts`). Informe legible: `docs/coherencia-partidas-informe.md` (generado; no commitear salvo revisión humana).

---

## Alcance: tipos de partida

| Modo | Origen | Qué auditar |
| ---- | ------ | ------------- |
| **Catálogo** | `pilot`, `lighthouse`, `interactive-lab`, `geo-lab` | Narrativa ↔ puzzles ↔ `theme` ↔ catálogo UI |
| **Evento generado** | `celebration`, `birthday`, `mystery`, `team` | Cadena sensorial, códigos desde `facts`/`subject`, tono por tipo |
| **Scanner espacial (1 habitación)** | arquetipos `temporal`, `inventory_hunt`, `visual_trace` | Objetos escaneados → respuestas derivadas → salida |
| **Lobby / promesa UX** | `lobby-home-modes.ts`, `ROOM_CATALOG`, `ADVENTURE_VISUAL` | Misma temática urban/coastal entre tarjeta y sala |

No auditar en esta pasada: copy del GameMaster LLM, balance de dificultad subjetivo, ni legalidad de Pexels.

---

## Criterios de coherencia (experto ER)

### A. Mecánica — «cada estación da algo que otra consume»

1. **Prefijo sonido → candado numérico** (eventos generados): `sound_intro.answer` ⊆ prefijo de `entry_lock.answer`.
2. **Grafo jugable:** desde `startSceneId`, existe camino hasta `winCondition` (motor `applyAction`, soluciones conocidas en tests o derivadas).
3. **Salidas:** cada `exit.when` referencia puzzles que existen en la escena actual o ya resueltos en el camino.
4. **Espacial `temporal`:** `spatial_bridge.answer` alineado con `spatial_finale.answer` cuando el diseño dice «combinar pistas».
5. **Victoria:** solo `winCondition.puzzleId` marca `won`; puzzles opcionales no bloquean sin copy que lo explique.

### B. Narrativa y tono

1. **`theme`:** `coastal` en salas costeras/misterio generado; `urban` en edificio/pilot/equipo (tolerar excepciones documentadas en informe).
2. **Diferenciación de tipos generados:** `birthday` vs `celebration` no deben compartir el mismo cuerpo de escena; `mystery` debe evocar costa/investigación en textos (no solo imágenes).
3. **Catálogo ↔ metadata:** `ROOM_CATALOG.theme` = `room.theme`; `tagline` no contradice la primera escena.
4. **Lab / demo:** pistas YAML que mencionan códigos distintos a `answer` → **warning** (confunde en QA, aunque sea intencional).

### C. Coherencia cross-modo (producto)

1. Mismo jugador no debería ver «faro costero» en tarjeta de misterio y escenas 100 % urbanas sin transición.
2. Modo **crear** (4 plantillas) y **catálogo** usan el mismo vocabulario de `theme` (`urban` | `coastal`).
3. Eventos multijugador: mismos puzzles por sesión; leaderboard no implica estado compartido (solo verificar que no hay copy de «cooperación en tiempo real» en textos de sala generada).

---

## Procedimiento (agente / humano)

1. `pnpm validate-rooms` y `pnpm test` — prerequisito verde.
2. `pnpm audit-coherence` — leer informe en consola o `docs/coherencia-partidas-informe.md`.
3. Clasificar hallazgos:
   - **error:** rompe victoria, referencia rota o mentira en pista nivel 1–2 de sala de producción (`pilot`/`lighthouse`).
   - **warning:** lab/demo, tono débil, imagen-tema desalineado, redundancia birthday/celebration.
   - **ok:** comprobación explícita por modo.
4. Proponer cambios mínimos en YAML o `generate-adventure.ts` / `build-room.ts`, no reescrituras masivas.

---

## Formato de informe esperado

```markdown
# Informe coherencia partidas — {fecha}

## Resumen
- Errores: N | Warnings: M | Modos OK: …

## Por modo
### Catálogo: pilot
- [ok|warning|error] …

### Evento: mystery
…

## Recomendaciones priorizadas (máx. 5)
```

---

## Fixture de prueba (evento generado)

Usar siempre el mismo `eventId` para reproducibilidad:

```json
{
  "adventureType": "birthday",
  "teamCount": 4,
  "subject": { "name": "Ada Lovelace", "age": 36, "nickname": "Ada" },
  "facts": ["Nació en 1815", "Le gustan los puzzles"]
}
```

Arquetipos espaciales: entorno `sampleEnv` de `generate-spatial.test.ts`.

---

## Referencias

- [authoring-rooms.md](./authoring-rooms.md)
- [prompt-custom-events.md](./prompt-custom-events.md)
- [prompt-sensory-escape-room-v3.md](./prompt-sensory-escape-room-v3.md)
- [prompt-ux-ui-temas-visuales.md](./prompt-ux-ui-temas-visuales.md)
