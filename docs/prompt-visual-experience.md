# Prompt: experiencia visual escapeAI (ejecutado)

Brief original para elevar la PWA de MVP “cutre” a producto jugable con atmósfera.

## Objetivo

Transformar el cliente en una **experiencia inmersiva tipo escape room digital**: portada con salas en tarjetas visuales, escena actual con **imagen hero**, progreso por habitaciones, inventario con nombres legibles, puzzles con títulos y panel de diario estilo “bitácora”, sin cambiar la lógica del motor.

## Restricciones

- El motor sigue siendo la fuente de verdad; solo metadata opcional en YAML (`image`, `coverImage`, `label`).
- Sin nuevas dependencias de UI pesadas (sin shadcn por ahora).
- Imágenes en `apps/web/public/media` (PWA cacheable).
- Mantener accesibilidad: contraste, `role="alert"`, labels.

## Paleta y atmósfera

| Sala | Tema | Acento |
|------|------|--------|
| pilot | Nocturno urbano, neón frío | cian `#38bdf8`, ámbar en warnings |
| lighthouse | Tormenta, faro, salitre | índigo `#818cf8`, espuma `#e0f2fe` |

## Entregables

1. Tipografía display (Fraunces) + cuerpo (DM Sans).
2. `PublicState` con imagen de escena e ítems con nombre visible.
3. YAML enriquecido + fotos por escena.
4. `/api/rooms` con portada y tagline para el lobby.
5. Componentes: `SceneHero`, `ProgressRail`, `RoomCard`, pantalla victoria/derrota con ilustración.
