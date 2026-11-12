# QA manual — puzzles sensoriales (móvil)

Probar en **HTTPS** (producción o túnel). Un móvil por equipo.

## Laboratorio `interactive-lab`

| Estación | Pasos | OK si |
| -------- | ----- | ----- |
| Sonido (beeps) | Pulsar reproducir; esperar fin + mínimo | `listen` y envío habilitado; respuesta `3` exacta (sin fuzzy) |
| Visual | Zoom 2s o botón | `view`; respuesta numérica exacta |
| Cámara | Continuar → foto → `PLATO`/`TAZA`/`TAZÓN`/`BOL` | Sin POST de imagen al API |
| Voz | Continuar → hablar o texto | Fuzzy en frases; vacío rechazado |

## Permisos y privacidad

- Cámara: permiso solo al pulsar **Continuar** en la estación.
- Micrófono: permiso al pulsar **Hablar ahora**; Web Speech puede usar nube del navegador (**no** afirmar offline).
- Tras captura, comprobar que la imagen no aparece en red (DevTools → sin upload).

## Navegadores

| Entorno | Comprobar |
| ------- | --------- |
| Chrome Android | Beeps, Howler, cámara trasera, voz |
| Safari iOS | Audio tras gesto; fallback texto si no hay Speech |
| Recarga con sesión | Progreso Redis; estaciones no piden permiso al cargar home |

## Audio

- Sin autoplay antes de pulsar.
- Patrón corto + `minListenSec`: no debe quedar bloqueado (espera hasta cumplir mínimo).
- URL: `listen` tras fin del clip y `minListenSec`.

## Rally `geo-lab`

| Paso | OK si |
| ---- | ----- |
| Llegar al punto | Permiso GPS; «Estoy aquí» resuelve dentro del radio (~Puerta del Sol demo) |
| Quiz entorno | Tras `arrive`, respuesta `madrid` |

Probar **al aire libre con datos móviles**; en escritorio suele fallar por falta de GPS.

## P1 (lazy)

- Cámara `ocr_hint`: tras foto aparece pista local; nada al API.
- Voz **Modo offline**: descarga modelo ~40 MB; no se precachea en SW.
- Visual `dual`: slider compare dos imágenes Pexels.

## Regresión

- `pnpm build`, `pnpm test`, `pnpm validate-rooms`
- Catálogo `pilot` / eventos equipos + leaderboard

## Errores de red

- Pexels/fal caídos: mensaje en visual; puzzle sigue con botón manual si hay URL local.
