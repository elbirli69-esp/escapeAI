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
| **Material imprimible** | QR, cartel, etiqueta, secuencia de colores, ficha local | `prepChecklist` en propuestas + `MECHANIC_CATALOG` (`needsPrepByDefault`) |

No inventario aquí: candados Bluetooth, actuadores IoT, **espejos** (no hay categoría `mirror`; solo `painting`/`decoration` en foto o pantalla), ni mobiliario fuera del taxonomía scanner (roadmap aparte).

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

### F. Material imprimible y montaje (`SpatialPrepKind`)

1. **Listar** todas las entradas `prepChecklist` / `prep` de propuestas **espacial 1 hab.** y **site** (fixture audit).
2. Clasificar cada ítem:
   - `organizer_setup` → montaje físico (puede incluir imprimir QR, cartel, stickers).
   - `digital_only` → opcional en sala; el jugador puede resolver solo con móvil.
   - `existing_object` → usar objeto ya escaneado (sin imprimir).
3. **Impresión explícita** si el texto menciona: imprimir, QR, cartel, etiqueta, sticker, cinta/colores.
4. **Puzzles `qr_scan` / `ocr_hint`:** listar por modo aunque no haya prep en YAML (motor sí exige soporte físico u objeto con texto).
5. **Modos digital-first:** catálogo `interactive-lab`, eventos generados, `geo-lab` (GPS) → sin checklist obligatoria; marcar props narrativos (token, fusible) como *recomendados, no validados*.
6. **QR de lobby de evento:** siempre generable en pantalla (`EventJoinQr`); imprimir es comodidad del organizador.

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