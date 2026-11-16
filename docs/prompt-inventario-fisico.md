# Prompt — Inventario de cosas físicas (escapeAI)

**Rol:** técnico de escape room y product owner de experiencias híbridas (sala real + móvil).  
**Objetivo:** dejar claro **qué capacidades físicas** exige el producto hoy (hardware del jugador, objetos en sala, GPS, scanner) y **dónde se usan** en cada modo de partida.

**Ejecución automatizada:** `pnpm audit-fisico` → `packages/escape-content/src/audit-fisico.ts`. Informe legible: `docs/inventario-fisico-informe.md` (generado; no commitear salvo revisión humana).

---

## Qué contamos como «físico»

| Capa | Qué incluye | Fuente de verdad |
| ---- | ----------- | ---------------- |
| **Sensor móvil** | Altavoz, micrófono, cámara, pantalla, GPS | Tipos de puzzle `sound` / `voice` / `camera` / `visual` / `location` |
| **Props en sala** | Objetos que el jugador recoge o usa (`take_item`, `use_item`, `inventory`) | `items` + puzzles en YAML / generador |
| **Entorno escaneado** | Categorías COCO → inventario semántico (reloj, libro, planta…) | `@escapeai/shared` `OBJECT_CATEGORIES`, `ScannedEnvironment` |
| **Mecánicas espaciales** | Acciones declaradas en propuestas (`CLOCK_OBSERVATION`, `QR_CHECKIN`, …) | `SpatialMechanicId` en propuestas + puzzles derivados en `buildSpatialRoom` |
| **Preparación organizador** | Restricciones del entorno (`constraints`, props `organizer_setup`) | Scanner + copy `SpatialPrepItem` |

No inventario aquí: candados Bluetooth, actuadores IoT, ni mobiliario genérico fuera del taxonomía del scanner (roadmap aparte).

---

## Alcance por modo

| Modo | Qué listar |
| ---- | ---------- |
| **Catálogo** (`pilot`, `lighthouse`, `interactive-lab`, `geo-lab`) | Tipos de puzzle, items, location/GPS |
| **Evento generado** (4 `adventureType`) | Cadena sensorial por acto (sonido → cámara → token → visual → voz) |
| **Espacial 1 hab.** | Propuestas × arquetipo → mecánicas + categorías de objeto usadas |
| **Site multi-habitación** | Igual + exterior / geo si aplica |

---

## Criterios del informe

1. **Matriz global:** cada `PuzzleType` → hardware requerido + modos que lo usan.
2. **Cobertura taxonomía:** categorías de objeto **nunca** referenciadas en propuestas espaciales → warning (oportunidad o hueco).
3. **Mecánicas huérfanas:** `SpatialMechanicId` declarada en tipos pero ausente en propuestas generadas del fixture audit → warning.
4. **Lab vs producción:** `interactive-lab` es referencia de sensores; `pilot`/`lighthouse` son salas «físicas clásicas» (inventory + code).
5. **Recomendaciones:** máx. 5 acciones (comprar/preparar prop, probar en dispositivo, documentar en QA).

---

## Procedimiento

1. `pnpm validate-rooms` (opcional si cambiaste YAML).
2. `pnpm audit-fisico`
3. Revisar `docs/inventario-fisico-informe.md` antes de planificar compras o playtests.

---

## Referencias

- [prompt-interactive-challenges.md](./prompt-interactive-challenges.md)
- [prompt-mobile-sensory-puzzles-v2.md](./prompt-mobile-sensory-puzzles-v2.md)
- [qa-mobile-puzzles.md](./qa-mobile-puzzles.md)
- [scanner-phase-4d-ar-3d.md](./scanner-phase-4d-ar-3d.md)
- [authoring-rooms.md](./authoring-rooms.md)