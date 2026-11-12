# QA manual — puzzles sensoriales (móvil)

Probar en **HTTPS** (producción o `vite` con túnel). Un móvil por equipo.

## Laboratorio `interactive-lab`

| Estación | Pasos | OK si |
| -------- | ----- | ----- |
| Sonido (beeps) | Reproducir ≥2s, responder `3` | Desbloquea envío tras `listen` |
| Visual | Zoom 2s o botón | `view` y respuesta numérica |
| Cámara | Permiso → foto → `PLATO` o `TAZA` | Sin subida al servidor |
| Voz | Hablar «luego» o texto fallback | Fuzzy acepta pequeños errores |

## Evento generado

1. Crear evento 2 equipos, 30 min.
2. Unir equipo, jugar hasta puzzle de voz.
3. Leaderboard actualiza al resolver.

## Navegadores

- Chrome Android: voz + cámara trasera.
- Safari iOS: si falla voz, fallback texto.
- Comprobar que audio no autoplay sin pulsar.

## Regresión

- Sala `pilot` o catálogo clásico sigue jugable.
- `pnpm test` y `pnpm build` en raíz.
