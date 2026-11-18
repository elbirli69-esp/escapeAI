# Informe auditoría final — post 8.5+ (2026-11-18)

**URL:** https://escapeai-self.vercel.app  
**Viewports:** móvil 390px, escritorio 1280px  
**Referencia:** 8.0/10 (informe post-P3)

## Verificaciones clave PR #86

| Check | Resultado |
|-------|-----------|
| Focus visible en tarjetas (Tab) | ✅ Borde acento ~3px |
| Hover acentos por modo | ✅ Glow urban/coastal/celebration |
| Contraste `.muted` en partida | ✅ Tokens sin opacity degradada |
| Botón «Copiar enlace TV» | ⚠️ No probado con evento real (requiere código válido) |

## Puntuación

| Dimensión | Nota | Evidencia |
|-----------|------|-----------|
| V1 Identidad | 9.0 | Paleta coherente, cartel, ambiente home |
| V2 Jerarquía | 9.0 | Hero + tarjetas + meta legibles |
| V3 Tarjetas/fotos | 9.5 | 5 Pexels distintos; join más luminoso |
| V4 Densidad | 8.5 | Grid desktop; móvil aún compacto |
| V5 Accesibilidad | 9.0 | Focus ring; muted en partida mejorado |
| U1 Claridad | 9.0 | Modos y wizard claros |
| U2 Flujos | 8.5 | Validaciones; org. sin mensaje si código inválido |
| U3 Consistencia | 9.5 | VisualCard + LobbyShell + cartel |

**Global ponderada: 9.1 / 10** (+1.1 vs. 8.0)

## Top 3 hacia 9.5+

1. **Organizador:** error claro si el código no existe (no spinner infinito).
2. **Móvil:** algo más de separación entre tarjetas del home.
3. **A11y:** `aria-label` en tarjetas (descripción completa en un solo string).

## Capturas

Ver artefactos del agente: `audit3-home.webp`, `audit3-focus.webp`, `audit3-catalog.webp`.

## Histórico

| Fecha | Global |
|-------|--------|
| Pre-P0 | ~7.3 |
| Post-P3 | 8.0 |
| Post 8.5+ | **9.1** |