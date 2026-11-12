# ScannerAI — Fase 4d: AR, mapas 3D y SLAM (estudio)

Documento de **decisión técnica**. No describe trabajo implementado: las fases **4a–4c** ya cubren recintos multi-habitación con mapa topológico 2D, pasajes (QR/código) y GPS **solo** para contexto urbano (ciudad/barrio).

## Objetivo del estudio

Valorar si conviene, en el futuro, añadir **realidad aumentada**, **modelos 3D** o **localización milimétrica** al flujo ScannerAI, sin romper:

- Privacidad (procesamiento de imagen en cliente; inventario semántico al backend).
- Motor determinista (`@escapeai/escape-engine` como fuente de verdad).
- PWA como canal principal (sin microservicios ni APIs de mapas de pago sin aprobación explícita).

## Qué tenemos hoy (alternativa adoptada)

| Capacidad | Implementación |
| --------- | ---------------- |
| Varias habitaciones | `ScannedSite` + inventarios enlazados |
| Topología | Mapa esquemático lineal / hub (`SiteMapSchematic`) |
| Movimiento real | Jugador en el espacio físico; motor cambia **escena** tras puzzles / pasajes |
| Pasajes | Códigos `SITE-…`, QR, confirmación manual (no GPS interior) |
| Entorno urbano | `SiteGeoContext` + `locationIntent: area_context` (radio amplio, quizzes) |
| Exterior | `outdoorRoomId` + propuesta `spatial-site-exterior` |

Esto resuelve el 80% de “sé dónde estoy en el recinto” con **semántica y topología**, no con geometría métrica.

## Opciones evaluadas

### A. WebXR / escaneo de habitación en navegador

- **Qué promete:** malla ligera o plano desde la cámara.
- **Limitaciones:** soporte irregular en iOS Safari; permisos y UX largos; modelos y shaders aumentan bundle y complejidad de caché PWA.
- **Privacidad:** aunque el procesamiento sea local, el organizador podría exportar mallas; requiere política clara. Riesgo de “fugas” si alguien sube mallas a un backend (fuera de alcance actual).
- **Veredicto:** **no recomendado en PWA MVP**.

### B. LiDAR / RoomPlan (app nativa, p. ej. Capacitor)

- **Qué promete:** planta relativamente fiel en iPhone Pro / iPad.
- **Limitaciones:** canal distinto (no solo PWA); Android heterogéneo; mantenimiento de dos superficies (web + nativo).
- **Privacidad:** las mallas son geometría del hogar — más sensibles que inventario de objetos COCO.
- **Veredicto:** **candidato solo si el producto pivota a app nativa** y hay consentimiento explícito del organizador; no bloquea el roadmap web.

### C. Fotogrametría / nube de puntos en navegador o backend

- **Qué promete:** modelo 3D “fotorrealista”.
- **Limitaciones:** tiempo de captura, subida de muchas fotos, coste de cómputo, fricción.
- **Privacidad:** **incompatible** con la regla actual de no enviar imágenes al backend sin rediseño de confianza.
- **Veredicto:** **descartado** salvo producto B2B con hosting dedicado y contrato aparte.

### D. SLAM / VIO para waypoints interiores con GPS

- **Qué promete:** “estás a 2 m de la puerta”.
- **Limitaciones:** deriva, magnetómetro, multihistoria; indoors el GPS no sirve para waypoints (acordado: GPS solo ciudad/barrio).
- **Veredicto:** **no alineado** con la política de localización acordada para ScannerAI.

### E. Mapa 2D topológico + waypoints semánticos (actual)

- **Qué da:** cajas, enlaces, etiquetas de pasaje, ruta sugerida, escenas del motor.
- **Veredicto:** **solución de referencia**; seguir mejorando UX (E2E, leyenda en lobby de evento) sin 3D.

## Criterios de “sí” futuro (gate)

Solo reconsiderar AR/3D si **todas** se cumplen:

1. Caso de uso que el mapa 2D **no** puede expresar (p. ej. venue &gt; 2000 m² con planta legal obligatoria para seguridad).
2. Canal **nativo** o WebXR con cobertura verificada en la audiencia objetivo.
3. Modelo de privacidad firmado: qué se queda en dispositivo, qué se puede exportar, TTL, sin entrenamiento de terceros con imágenes.
4. Presupuesto y aprobación para servicios externos (si los hubiera) — **no por defecto**.
5. El motor sigue resolviendo victoria por `puzzle_solved` / condiciones YAML, no por “el mesh encaja”.

## Recomendaciones

| Horizonte | Acción |
| --------- | ------ |
| **Corto (actual)** | Mantener 4a–4c; Playwright E2E recinto opcional; refinar mapa en lobby de evento. |
| **Medio** | Si hace falta “planta” visual: **SVG generado desde `ScannedSite.links`** (2D, sin metría), mismo contrato `spatialSiteMap`. |
| **Largo** | Spike **Capacitor + RoomPlan** en rama aparte; sin integrar al motor hasta tener política de datos. |
| **No hacer** | Microservicio SLAM; Google Places / Mapbox para puzzles; subir nubes de puntos al API de EscapeAI. |

## Relación con otros documentos

- Principios globales: [architecture.md](./architecture.md)
- Authoring de salas: [authoring-rooms.md](./authoring-rooms.md)
- Contratos Scanner: `packages/shared` (`ScannedSite`, `SiteGeoContext`, `SpatialSiteMapPublic`)

## Estado

- **Fase 4d:** cerrada como **estudio** (este documento).
- **Implementación AR/3D:** fuera de alcance hasta revisión explícita contra la tabla “gate” anterior.

---

*Última revisión: acorde a ScannerAI Fases 4a–4c en `main` (recintos, hub/lineal, exterior, GPS contexto urbano).*
