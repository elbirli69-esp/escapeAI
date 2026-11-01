# Prompt — motion design presentación escapeAI

## Objetivo

Enriquecer `presentacion-escapeai.html` con movimiento **legible y premium**, sin librerías externas, respetando `prefers-reduced-motion`.

## Requisitos ejecutados

1. **Fondo:** orbes difuminados con deriva lenta (CSS keyframes).
2. **Entrada por scroll:** IntersectionObserver toggles `.visible`; reveals, cards escalonadas, chips pop + float.
3. **Personalización:** columnas versus entran desde lados opuestos.
4. **Juego mixto:** paneles desde izquierda/derecha; iconos bob; “+” pulse; barra puente que se rellena al entrar en viewport.
5. **Roadmap:** pills del flujo aparecen en cascada; flechas con nudge horizontal loop.
6. **MVP:** anillo SVG draw + número pop.
7. **Fases:** badge numérico con pulso suave.
8. **Caso de uso:** pasos entran en stagger desde la izquierda.
9. **Global:** hero pill shimmer; hint scroll bounce; logo AI glow; hover lift en cards.

## Restricciones

- Sin bottom nav; solo scroll snap.
- Un solo archivo HTML.
- Reducir animaciones si el usuario prefiere menos movimiento.
