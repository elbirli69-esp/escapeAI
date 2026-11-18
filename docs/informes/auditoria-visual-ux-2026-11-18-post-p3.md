# Informe auditoría escapeAI — post P0–P3 (2026-11-18)

**URL:** https://escapeai-self.vercel.app  
**Viewports:** móvil ~390px, escritorio 1280px  
**Prompt:** [prompt-auditoria-visual-ux.md](../prompt-auditoria-visual-ux.md)

## Evolución

| Informe | Global | Nota |
|---------|--------|------|
| Inicial (pre-P0) | **7.3** | Mismas fotos locales, contraste bajo |
| Automatizado mid-P0 | 7.6 | Fotos más luminosas detectadas |
| **Este informe (post-P3)** | **8.0** | Pexels, validación, cartel, acentos home |

## Puntuación actual

| Dimensión | Nota | Evidencia |
|-----------|------|-----------|
| V1 Identidad | **8.5** | Ambiente radial en home, acentos por modo, cartel al crear / TV |
| V2 Jerarquía | **7.5** | Hero claro; wizard largo pero CTA sticky |
| V3 Tarjetas/fotos | **9.0** | 5/5 Pexels en `/api/lobby/home`; catálogo con portadas distintas |
| V4 Densidad | **8.0** | Grid 3 cols desktop, skeletons de carga |
| V5 Accesibilidad | **7.0** | Tokens `--text-muted/secondary`; restan opacidades sueltas en juego |
| U1 Claridad | **8.5** | Modos autoexplicativos; placeholders en join/crear |
| U2 Flujos | **7.5** | Validación join/organizador/crear; fade entre pantallas |
| U3 Consistencia | **8.5** | `VisualCard`, `LobbyShell`, cartel compartido |

**Global ponderada: 8.0 / 10** (+0.7 vs. línea base)

## Qué mejoró con P0–P3

- Contraste y taglines sin `opacity` degradada (P0).
- Join + wizard validados; microcopy (P1).
- Layout desktop, skeletons, transiciones (P2).
- Acentos home, portada Pexels al crear evento, cartel organizador (P3).

## Top 5 para acercarse a 10/10

1. **Contraste en partida** — revisar `.muted` / overlays en `App.tsx` y puzzles (Lighthouse contrast).
2. **Hover visible sin hover real** — reforzar `:focus-visible` en tarjetas para teclado; comprobar `prefers-reduced-motion`.
3. **Textos sobre fotos muy oscuras** — ajustar query Pexels de «join» o subir scrim en `VisualCard`.
4. **Organizador** — enlace copiable «Abrir en TV» (`?projector=1`) junto al botón modo TV.
5. **Métricas** — automatizar re-ejecución de este prompt en CI visual (Playwright screenshots + checklist).

## Capturas (re-auditoría)

- Home desktop: `audit2-home-desktop.webp`
- Plantillas crear: `audit2-templates.webp`
- Catálogo: `audit2-catalog.webp`

## Re-ejecutar

```text
Re-auditar escapeAI en producción con docs/prompt-auditoria-visual-ux.md
y guardar nuevo informe en docs/informes/.
```

Meta lanzamiento público: **≥ 8.5** global y **≥ 8.5** en V5 antes de campaña.