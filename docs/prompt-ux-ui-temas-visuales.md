# Prompt UX/UI: escape room visual por tema (plan ejecutable)

## Rol

Actúas como **lead UX/UI** de escapeAI: producto híbrido (fiesta multi-equipo + catálogo de salas YAML). La interfaz debe sentirse como **entrar en una sala temática**, no como un formulario técnico. Cada decisión visual se ancla en el **tema de la sala** (`urban`, `coastal`, futuros: `vintage`, `horror`, `celebration`).

## Objetivo

Hacer la aplicación **mucho más visual y autoexplicativa**:

1. **Portada y modos**: tarjetas con **foto arriba + título y descripción debajo** (patrón “poster de escape room”).
2. **Catálogo de salas**: misma jerarquía; portada YAML (`coverImage`), tagline emocional, resumen en una línea, chips de duración/escenas/tema.
3. **Partida**: mantener hero de escena, pero **heredar tema** de sala (tokens CSS) en todo el recorrido.
4. **Eventos generados**: cuando exista `coverImage` en aventura procedural, usar la misma tarjeta (coherencia catálogo ↔ evento).

## Restricciones (no negociables)

- Motor y API son fuente de verdad; solo metadata opcional en YAML (`coverImage`, `image`, `tagline`, `theme`, `mood`).
- Sin librerías UI pesadas; CSS custom + tipografía ya cargada (Fraunces + DM Sans).
- Assets en `apps/web/public/media` (PWA cacheable); Pexels/Fal solo para eventos custom, no para salas base.
- Accesibilidad: `alt` descriptivo en portadas, contraste ≥ 4.5:1 en texto sobre gradientes, `role="alert"` en errores.

## Sistema visual por tema

| Tema | Sensación | Acento | Fondo / glow | Uso de foto |
|------|-----------|--------|--------------|-------------|
| `urban` | Noche, neón, edificio dormido | `#38bdf8` | `#0c1222`, glow cian | Contraste frío, luces artificiales |
| `coastal` | Tormenta, salitre, faro | `#818cf8` | `#0a1020`, espuma `#e0f2fe` | Horizonte, muelle, linterna |
| `celebration` (eventos) | Fiesta, competición amable | `#f472b6` | violeta suave | Retratos / collage generado |
| `lab` (sensorial/GPS) | “Sala de pruebas” dentro del universo urbano | hereda urban + badge “Demo” | Reutilizar urban hasta tener arte propio |

**Regla**: al seleccionar una sala o entrar en partida, el `body`/shell aplica `theme-{theme}` (ya existe en `App.tsx` para juego; extender al catálogo con sala seleccionada).

## Patrón de tarjeta autoexplicativa

```
┌─────────────────────────┐
│  [FOTO portada 16:10]   │  ← coverImage o fallback gradiente temático
│  (gradiente inferior)   │
├─────────────────────────┤
│  Título (Fraunces)      │
│  Tagline (1 línea mood) │
│  Resumen · 45 min · 4★  │  ← meta chips
└─────────────────────────┘
```

- **Foto arriba, texto debajo**: el jugador entiende la fantasía antes de leer el párrafo largo.
- Estado `active`: borde acento + sombra (ya en `.room-card-v2.active`).
- Hover/focus: ligero `scale` en imagen (solo `prefers-reduced-motion: no`).

## Mapa de pantallas (prioridad)

### P0 — Hecho en esta iteración

- [x] Catálogo clásico: `coverImage` + tagline + summary en tarjetas apiladas.
- [x] Home: cuatro modos con imagen temática y copy debajo.
- [x] Catálogo: clase `theme-{theme}` según sala seleccionada (preview atmosférica).
- [x] Documento de plan (este archivo).

### P1 — Siguiente sprint

- [x] **Plantillas de aventura** (`/api/adventures`): tarjetas visuales al elegir tipo (cumpleaños, despedida, etc.).
- [x] **Panel organizador**: fondo temático del evento + código estilo “cartel de fiesta”.
- [x] **Ítems**: miniatura opcional `item.image` en YAML → `imageUrl` en partida.
- [x] **Victoria/derrota**: portada `roomCoverImage` + copy según tema urban/coastal.

### P2 — Contenido y marca

- [x] Arte propio en catálogo/YAML para `interactive-lab` y `geo-lab` (portadas y escenas distintas).
- [x] `cardImage` por puzzle en laboratorio + componente `PuzzleInstructionCard`.
- [x] Modo TV (`?projector=1` + botón), avatares por iniciales en ranking.

### P3 — Motion y audio (opcional)

- [ ] Transición cross-fade entre escenas al cambiar `sceneImageUrl`.
- [ ] Ambiente: loop muy bajo por tema (Howler, ya previsto en prompt mobile v2).

## Contenido YAML (autoría)

Para cada sala nueva:

```yaml
theme: coastal
coverImage: /media/mi-sala-cover.jpg
tagline: Una frase que vende la fantasía.
```

Cada escena:

```yaml
image: /media/mi-sala-escena.jpg
mood: Frase corta en cursiva bajo el hero.
```

Checklist foto: 1200×750 mín., peso < 200 KB, `object-fit: cover`, sin texto embebido ilegible en móvil.

## Métricas de éxito UX

- Usuario nuevo elige sala **sin leer README** (test moderado: 5 personas, < 30 s hasta “Empezar”).
- Tasa de abandono en lobby ↓ (si hay analytics).
- Feedback cualitativo: “parece escape room”, no “parece app de formularios”.

## Prompt corto para agente implementador

```
Contexto: escapeAI monorepo — apps/web React, estilos en styles.css, salas en packages/escape-content/rooms/*.yaml, API /api/rooms devuelve coverImage y theme.

Tarea: Elevar lobby y catálogo a tarjetas visuales con imagen arriba y texto debajo; aplicar theme-* al previsualizar sala; no tocar motor.

Archivos clave: ExperienceLobby.tsx, styles.css, rooms.ts (metadatos), public/media/*.

Criterios: coverImage en catálogo; modos home con foto; chips de duración; accesibilidad alt; build y test verdes.
```

## Referencias internas

- [prompt-visual-experience.md](./prompt-visual-experience.md) — primera oleada (hero, progress, tipografía).
- [prompt-mobile-sensory-puzzles-v2.md](./prompt-mobile-sensory-puzzles-v2.md) — puzzles sensoriales en fiesta.
