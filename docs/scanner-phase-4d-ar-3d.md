# ScannerAI — Fase 4d: AR, mapas 3D y SLAM (estudio cerrado)

Documento de **decisión arquitectónica**. Describe el estado verificado en `main` (noviembre 2026), la postura sobre AR/3D/SLAM y la evolución prioritaria del **mapa topológico 2D** (incl. SVG). **No autoriza** implementación de AR, 3D ni SLAM.

Producción de referencia: https://escapeai-self.vercel.app

---

## 1. Estado real de las fases 4a–4c (verificado en código)

| Fase | Alcance | Evidencia en `main` |
| ---- | ------- | --------------------- |
| **4a** | Recintos multi-habitación, persistencia, propuestas, mapa esquemático, pasajes `SITE-…`, GPS urbano | `ScannedSite`, API `/api/scanned-sites`, `buildSpatialSiteRoom`, `SiteBuilder`, tests `apps/api/src/site.test.ts` |
| **4b** | Navegación en partida, banner de habitación, mapa HUD, hub/lineal, inmutabilidad evento vs site | `toPublicState` en `packages/escape-engine/src/session.ts`, `SpatialSitePlayMap`, `site-events.test.ts` |
| **4c** | Exterior `outdoorRoomId`, propuesta `spatial-site-exterior` | `generate-site-proposals.ts`, `generate-site-exterior.test.ts` |

### Capacidades implementadas (no confundir con propuestas futuras)

| Capacidad | Implementación |
| --------- | ---------------- |
| Varias habitaciones | `ScannedSite.roomIds` + inventarios `ScannedEnvironment` |
| Topología | `SiteLink[]`, `mapLayout: "linear" \| "hub"` |
| Mapa visual | `SiteMapSchematic` (layout HTML/CSS, no SVG generado) |
| En partida | `PublicState.spatialSiteMap` + `SpatialSitePlayMap` (`data-testid="escape-site-play-map"`) |
| Organizador | `SiteBuilder`, `SiteAdventurePicker`, flujo en `ScannerFlow` |
| Pasajes entre escenas | Puzzles puente en sala generada; QR/código/manual (motor) |
| GPS | `locationIntent: "area_context"` + `SiteGeoContext` (ciudad/barrio; no waypoints interiores) |
| Exterior | `outdoorRoomId`; propuesta sustituye `spatial-site-urban` por `spatial-site-exterior` cuando hay exterior |

### Propuestas de aventura de recinto (IDs reales)

- `spatial-site-recorrido`
- `spatial-site-hunt`
- `spatial-site-urban` (sin habitación exterior)
- `spatial-site-exterior` (con `outdoorRoomId`)

---

## 2. Decisión arquitectónica principal

**El mapa topológico 2D es la solución de referencia.** La reconstrucción geométrica del recinto **no** forma parte del roadmap inmediato.

EscapeAI no busca una réplica digital del edificio. Busca que los equipos:

- Entiendan dónde encajan en la aventura narrativa.
- Identifiquen habitaciones y conexiones.
- Descubran pasajes y avancen en el espacio físico.
- Sepan qué pruebas existen en la escena actual (vía motor/UI de puzzles, no vía SLAM).

**Separación obligatoria de conceptos**

| Concepto | Responsable |
| -------- | ----------- |
| Localización física del jugador | El jugador en el mundo real; la PWA puede orientar con topología y texto |
| Progresión lógica del juego | `@escapeai/escape-engine` (sesión, escenas, puzzles resueltos, salidas) |

El motor es la **única fuente de verdad** para victorias, desbloqueos y transiciones. **Nunca** debe depender de SLAM, coordenadas estimadas, reconocimiento visual probabilístico ni alineación de mallas 3D.

---

## 3. Mapa de navegación vs mapa de juego

### A. Mapa de navegación

Representa la **estructura** del recinto (independiente de una partida concreta):

- Habitaciones y etiquetas.
- Enlaces (`SiteLink`: puerta, escalera, abierto).
- Layout lineal o hub.
- Ruta sugerida (`suggestedVisit`) derivada del orden de `roomIds` y topología.

**Fuente de datos hoy:** `ScannedSite` (organizador) materializado en la sala como `RoomDefinition.spatialSiteMap` (`SpatialSiteMapPublic`).

### B. Mapa de juego

Representa cómo se **usa** el espacio en la aventura y sesión actuales:

- Escena activa y puzzles visibles en `PublicState` (`puzzles`, `exits`, `solved`).
- Pasajes desbloqueados (condiciones YAML / puzzles puente resueltos).
- Progreso del equipo (escenas visitadas, tiempo, inventario).
- Siguiente destino narrativo (salidas disponibles, ruta orientativa).

**Fuente de datos hoy:** motor + `toPublicState`; la UI de juego compone mapa topológico + estado de sesión.

### Regla arquitectónica

Un mismo `ScannedSite` debe poder usarse en **distintas aventuras** sin mutar inventarios ni topología del site. Al crear un evento se fijan `roomInventoryVersions` y versión del site; editar el site posteriormente no altera eventos ya creados (verificado en `apps/api/src/site-events.test.ts`).

El **mapa de juego** debe derivarse de la **aventura** (`RoomDefinition` generada por propuesta) y del **estado de sesión**, no duplicar al motor en el frontend como segunda fuente de verdad.

### Estado actual del contrato `SpatialSiteMapPublic`

Ubicación: `packages/shared/src/spatial-site-public.ts`

```typescript
export type SpatialSiteMapPublic = {
  siteName: string;
  mapLayout: SiteMapLayout;
  rooms: Array<{ inventoryId: string; sceneId: string; label: string }>;
  links: SiteLink[];
  suggestedVisit: SpatialSiteVisitStep[];
  currentSpatialSceneId?: string;
  currentVisitOrder?: number;
};
```

**Observación (diseño híbrido actual):** el DTO mezcla datos de navegación (rooms, links, `suggestedVisit`) con enriquecimiento de sesión (`currentSpatialSceneId`, `currentVisitOrder` rellenados en `toPublicState`). Los puzzles por habitación **no** están en este DTO; viven en `PublicState.puzzles` / escena actual.

### Propuesta compatible (no implementada)

Sin nuevos contratos obligatorios hasta auditoría de necesidad:

| Vista | Origen | UI |
| ----- | ------ | -- |
| Navegación | Copia estática de `spatialSiteMap` sin campos de sesión, o mismo objeto ignorando `current*` en lobby | Lobby del evento, leyenda, `SiteBuilder` |
| Juego | `spatialSiteMap` + proyección de `PublicState` (puzzles no resueltos por `sceneId`, `exits`, sin revelar respuestas) | `SpatialSitePlayMap` y futuro SVG |

Capa de presentación (p. ej. `deriveSiteGameMapView(state: PublicState)`) en cliente: **proyección de lectura**, no estado duplicado persistido.

---

## 4. Evolución prioritaria: SVG topológico 2D

**Prioridad media plazo:** generar SVG desde la topología existente (`rooms`, `links`, `mapLayout`, opcionalmente `suggestedVisit` y señales de sesión), manteniendo compatibilidad con `SpatialSiteMapPublic` como entrada.

### Objetivo

Sustituir o complementar el esquema actual (`SiteMapSchematic`, nodos `<div>`) por un SVG más legible en móvil, sin cambiar semántica ni motor.

### Elementos visuales posibles (capas)

| Capa | Mapa de navegación | Mapa de juego |
| ---- | -------------------- | ------------- |
| Bloques habitación | Siempre | Si |
| Conexiones / pasajes | Siempre | Si; estilo según `SiteLink.transitionKind` |
| Ruta sugerida | Enumeración / orden | Resaltar paso actual (`currentVisitOrder`) |
| Descubierta / pendiente | N/A en lobby (todo visible al organizador) | Derivado de escenas alcanzables / visitadas (motor) |
| Pruebas / objetos | No (evitar spoilers en lobby) | Iconos genéricos por puzzle activo en escena, sin soluciones |

### Contextos

**Lobby del evento** (organizador o pre-partida jugador): estructura general, leyenda (símbolos puerta/escalera/abierto, exterior, ruta orientativa), texto de que no hay escala métrica.

**Durante la partida:** progreso, habitación activa, pasajes relevantes; **no** revelar pistas ocultas ni respuestas.

### Restricciones del SVG

- No es planta arquitectónica; sin escala ni coordenadas reales.
- Sin escaneo 3D, Mapbox, Google Places ni APIs comerciales de mapas.
- Generable desde `SpatialSiteMapPublic` + proyección opcional de `PublicState`.

### Gaps respecto a `main` (discrepancias)

| Tema | Código actual | Documento / roadmap |
| ---- | ------------- | ------------------- |
| Render | CSS/HTML en `SiteMapSchematic` | SVG propuesto, no implementado |
| Lobby con mapa | `SiteAdventurePicker` muestra prep y propuestas; **no** muestra mapa del recinto ni leyenda | Roadmap corto plazo: mejorar lobby |
| Exterior en HUD | `SiteBuilder` marca `isOutdoor`; `SpatialSitePlayMap` **no** pasa `isOutdoor` a nodos | Mejora UX menor pendiente |
| E2E Playwright | No hay specs de recinto en `e2e/` | Roadmap corto: revisar/añadir E2E |
| Pruebas | Vitest: `site.test.ts`, `site-events.test.ts`, `spatial-site-public.test.ts`, content spatial | Suficiente para API/motor; falta E2E UI |

---

## 5. Tabla comparativa de tecnologías

| Tecnología | Decisión | Notas |
| ---------- | -------- | ----- |
| **WebXR** | No en PWA MVP | Bundle, permisos, iOS irregular |
| **LiDAR / RoomPlan** | Solo si estrategia **app nativa** (p. ej. Capacitor) + política de datos | Spike independiente; sin motor |
| **Fotogrametría** | Descartada en arquitectura actual | Subida de imágenes incompatible con privacidad por defecto |
| **SLAM / VIO** | No alineado | GPS interior prohibido para waypoints; ver `SiteGeoContext` y `LocationIntent` |
| **Mapas 3D** | Fuera del roadmap inmediato | |
| **SVG topológico 2D** | **Evolución prioritaria** | Desde `ScannedSite` / `SpatialSiteMapPublic` |

Detalle histórico de opciones A–E (WebXR, RoomPlan, fotogrametría, SLAM, topología actual) se mantiene válido; los veredictos no cambian.

---

## 6. Gate para reconsiderar AR/3D

Reabrir la decisión **solo si se cumplen TODAS**:

1. Caso de uso real que el mapa topológico 2D no resuelve de forma razonable.
2. La tecnología mejora la experiencia de juego de forma **significativa** (no solo “es novedosa”).
3. Cobertura verificada en dispositivos de la audiencia objetivo.
4. Política explícita de privacidad, almacenamiento, exportación y eliminación de datos espaciales.
5. Costes de desarrollo, mantenimiento y servicios externos conocidos y aprobados.
6. Aprobación expresa para cambiar arquitectura o añadir dependencias.
7. El motor determinista sigue siendo la fuente de verdad de la progresión.

### Ejemplos que **podrían** justificar reconsideración

- Recintos muy grandes donde la topología abstracta sea insuficiente para orientación o seguridad.
- Instalaciones B2B con requisitos normativos de planos.
- AR donde la superposición espacial sea **esencial** para resolver un puzzle (y eso se modele aún como `puzzle_solved` en motor, no como heurística de mesh).

**No** es justificación suficiente: atractivo visual, moda tecnológica, o “tener 3D en la demo”.

---

## 7. Roadmap documental

### Corto plazo

- Mantener fases 4a–4c sin ampliar AR/3D.
- Mejorar mapa y **leyenda en lobby** (evento / pre-partida); hoy el mapa solo aparece en partida vía `SpatialSitePlayMap`.
- Revisar o añadir **E2E Playwright** para flujo recinto (organizador + join + HUD).
- Documentar y, en implementación futura, separar en UI **navegación** vs **juego** (misma fuente motor).

### Medio plazo

- **SVG** esquemático generado desde topología existente.
- Progreso del equipo y habitación activa (ya parcial en `currentVisitOrder`; extender capa visual sin nuevos campos si basta `PublicState`).
- Adaptación móvil del mapa.
- Mantener `SpatialSiteMapPublic` como contrato de entrada salvo que la auditoría exija un DTO de vista separado (solo presentación).

### Largo plazo

- Spike **Capacitor + RoomPlan** en rama aislada; **sin** integrar AR/3D en el motor.
- Reabrir AR/3D solo tras cumplir el gate completo.

### Fuera de alcance

- Microservicio SLAM.
- GPS interior para waypoints entre habitaciones.
- Google Places, Mapbox u otros mapas como dependencias de puzzles.
- Fotogrametría con subida de imágenes al backend.
- Mallas 3D o nubes de puntos persistidas en backend.
- Posicionamiento milimétrico del jugador como condición de victoria.

---

## 8. Privacidad y seguridad

Principios alineados con ScannerAI en `main`:

- Imágenes de cámara y CV se procesan en el **cliente**; el backend recibe inventario semántico y metadatos de recinto (`ScannedSite`), no fotogramas.
- No subir capturas, vídeo, mallas ni nubes de puntos al API.
- No usar imágenes de usuarios para entrenar modelos de terceros.
- Datos espaciales geométricos (si algún día existieran) requieren consentimiento, política y canal explícitos antes de exportación o persistencia.

`ScannedSite` en producción puede persistirse en **Upstash Redis** (`ScannedSiteStore` en `apps/api/src/scanned-site-store.ts`), distinto del texto genérico “sesiones en memoria” de `architecture.md` (ver discrepancias).

---

## 9. Contratos y documentos relacionados

| Recurso | Uso |
| ------- | --- |
| [architecture.md](./architecture.md) | Monorepo, motor, PWA |
| [authoring-rooms.md](./authoring-rooms.md) | YAML salas; puzzle `location` (`reach` / `quiz`); no documenta aún recintos Scanner |
| `packages/shared/src/scanned-site.ts` | `ScannedSite`, `SiteLink`, `SiteGeoContext` |
| `packages/shared/src/spatial-site-public.ts` | `SpatialSiteMapPublic` |
| `packages/shared/src/geo-context.ts` | Quizzes urbanos deterministas |
| `packages/shared/src/index.ts` | `PublicState.spatialSiteMap`, `LocationIntent` |
| `packages/escape-engine/src/room-definition.ts` | `spatialSiteMap` en definición de sala |
| `packages/escape-content/src/spatial/build-site-room.ts` | Materialización multi-escena |
| `apps/web/src/scanner/SiteMapSchematic.tsx` | Mapa esquemático |
| `apps/web/src/SpatialSitePlayMap.tsx` | HUD en partida |

---

## 10. Discrepancias documentación ↔ código (sin corregir en este estudio)

| # | Observación |
| - | ----------- |
| 1 | `architecture.md` describe persistencia de sesiones MVP; no menciona Redis/KV para `ScannedSite` / entornos escaneados. |
| 2 | `authoring-rooms.md` no enlaza flujo `ScannedSite` ni `locationIntent: area_context`. |
| 3 | Roadmap previo en este doc citaba “leyenda en lobby” como mejora; en `main` el mapa del recinto en jugador está solo en `App.tsx` durante la sesión, no en lobby de evento. |
| 4 | `SpatialSiteMapPublic` incluye campos de sesión; la separación navegación/juego es conceptual y parcial en el contrato. |
| 5 | No hay E2E Playwright de recintos; cobertura es Vitest (API + engine + content). |

---

## 11. Estado final

| Ítem | Estado |
| ---- | ------ |
| Fase 4d | **Estudio cerrado** (este documento) |
| AR / 3D / SLAM en producto | **No autorizado** |
| Implementación SVG / lobby / E2E | **Planificado** en roadmap; no incluido en 4d |
| Fases 4a–4c | **Implementadas** en `main` según tabla §1 |

---

*Última revisión: auditoría de código en `elbirli69-esp/escapeAI` (`main`), incorporando decisión 2D, dualidad navegación/juego, SVG prioritario, gate ampliado y discrepancias.*
