# Informe auditoría escapeAI — 2026-11-18

**URL:** https://escapeai-self.vercel.app  
**Viewports:** móvil ~390×844, escritorio 1280×800  
**Prompt usado:** [prompt-auditoria-visual-ux.md](../prompt-auditoria-visual-ux.md)

## Puntuación

| Dimensión | Peso | Nota | Evidencia breve |
|-----------|------|------|------------------|
| V1 Identidad / atmósfera | 15% | **8.5** | Paleta navy + acento cyan coherentes; sensación “noche / escape”; hero copy claro. |
| V2 Jerarquía visual | 15% | **7.0** | `display` fuerte en home; títulos de tarjeta compactas compiten con descripciones largas. |
| V3 Tarjetas y fotos | 15% | **7.5** | Pexels distintos por modo/plantilla (mejora reciente); alguna foto muy oscura (“Escanear”). Shimmer OK, primer paint mejorable en red lenta. |
| V4 Densidad y ritmo | 10% | **7.5** | Móvil cómodo; en desktop el grid de 5 modos comprime textos. |
| V5 Contraste / a11y | 15% | **6.0** | Clase `.muted` (#64748b en chips) y taglines sobre cards: riesgo bajo WCAG AA en textos secundarios. |
| U1 Claridad de tareas | 15% | **8.0** | Cada modo tiene verbo + subtítulo; “Crear / Entrar / Catálogo” entendibles en &lt;5 s. |
| U2 Flujo y recuperación | 10% | **6.5** | `← Volver` consistente; join sin validación visible; placeholder `ABCDEF` confunde. |
| U3 Consistencia | 5% | **7.5** | Mismo `VisualCard`; wizard crea evento más denso que home. |

**Global ponderada: 7.4 / 10**

*(Auditoría automatizada en producción; validar en dispositivo real y con lector de pantalla.)*

## Capturas (auditoría)

- Home desktop: ver artefacto del agente `audit-home-desktop.webp`
- Crear / plantillas móvil: `audit-create-mobile.webp`
- Catálogo móvil: `audit-catalog-mobile.webp`

## Top 8 mejoras hacia 10/10

| # | Impacto | Mejora | Dónde | Esfuerzo |
|---|---------|--------|-------|----------|
| 1 | Bloqueante | Subir contraste de `.muted`, `.lede.muted`, taglines en cards (`#c4cbd8` o token `--text-secondary` ≥ 4.5:1 sobre `#151d30`) | `styles.css` | S |
| 2 | Alto | Overlay inferior en `.room-card-media` (gradiente + texto siempre legible) | `VisualCard` / CSS | S |
| 3 | Alto | Títulos de tarjeta: +2px, `font-weight: 600`, clamp 2 líneas en descripción | `styles.css` | S |
| 4 | Alto | Join: placeholder `Ej: X7K2M9`, validación 6 caracteres, botón disabled + mensaje inline | `ExperienceLobby.tsx` | M |
| 5 | Medio | Grid desktop: `minmax(280px,1fr)` y max 3 columnas en `.mode-grid-visual` | `styles.css` | S |
| 6 | Medio | Estados `:focus-visible` más visibles en tarjetas (outline acento 2px) | `styles.css` | S |
| 7 | Medio | Wizard “Crear”: reducir párrafo bajo plantillas; CTA primario sticky en móvil | `ExperienceLobby` | M |
| 8 | Pulido | Skeleton alineado con shimmer actual para catálogo/plantillas (ya hay texto “Cargando…”) | lobby queries | S |

## Backlog ruta 10/10

### P0 — Percepción y accesibilidad (7.4 → ~8.5)

- Tokens de color documentados + audit Lighthouse contrast en home y join.
- Overlay en imágenes + revisar queries Pexels muy oscuras (scan/create).

### P1 — Claridad y confianza (~8.5 → ~9.2)

- Validación formularios evento/join.
- Microcopy: sustituir tecnicismos (“YAML”, “ScannerAI”) por beneficio en home.

### P2 — Escala y polish (~9.2 → ~9.7)

- Layout desktop del lobby; chips meta en tarjetas de catálogo (duración · escenas · tema).
- Transiciones entre modos (fade corto, sin layout shift).

### P3 — Wow factor (9.7 → 10)

- Tema dinámico al hover/selección en home (glow urban vs coastal por modo).
- Portada generada post-evento alineada con plantilla elegida.
- Modo TV / organizador con tipografía “cartel” y contraste para proyección.

## Cómo re-ejecutar

1. Copiar el prompt de `docs/prompt-auditoria-visual-ux.md`.
2. Pegar URL de producción y pedir al agente computerUse o diseño que rellene la tabla.
3. Guardar nuevo informe en `docs/informes/auditoria-visual-ux-YYYY-MM-DD.md`.
4. Meta de lanzamiento: **≥ 9.0** en V5 y U1 antes de marketing público.