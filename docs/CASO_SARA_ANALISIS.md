# Análisis — Caso «Cumpleaños de Sara» vs presentación y MVP

## Qué funciona hoy en la presentación

| Elemento | Valor |
|----------|--------|
| Escenario ancla (Marcos, Sara, 6 jugadores, 60 min) | Reconocible y comercial |
| Cinco actos con tiempos | Evita la percepción “solo interrogatorio” |
| Juego mixto PDF + QR + móvil | Alineado con `EXPERIENCE_DESIGN.md` |
| Jugador remoto mencionado | Correcto en intención; antes era secundario |
| Separación “hoy plantilla / mañana IA” | Acertada; hay que reforzarla visualmente |
| Motion design | Refuerza premium; no sustituye narrativa |

## Qué hay que mejorar

| Gap | Acción |
|-----|--------|
| Falta **historia del anfitrión** (crear sala, prep, no empezar hasta listos) | Escena 1 dedicada con checklist host |
| **Tipos de información** (pública / privada / compartida) poco visibles | Escena 3 con diagrama claro |
| **Remoto** como jugador de pleno derecho | Escena 5 protagonista, no nota al pie |
| **MVP vs IA** mezclado en frases sueltas | Slide o bloque visual dual |
| Poca **sensación social** (debates, mesa, risas) | Escena 4 con momentos concretos |
| Sin **matriz de validación** para desarrollo | `MVP_VALIDATION_SARA.md` |
| Estética genérica “tech dark” | Escenas cena/thriller por slide |

## Contradicciones y matices (producto real)

Estado repo (**Fase 0 documentación**): **ninguna funcionalidad implementada**. La presentación describe capacidades **previstas** en arquitectura y MVP scope.

| Narrativa | Realidad MVP / riesgo |
|-----------|------------------------|
| “Sara reconoce lugares de su vida” | **No en MVP** con «Seis sospechosos» fijo. Solo **futuro IA**. No prometer en copy MVP. |
| “Sobres por la casa” | Narrativa válida; MVP formal: **PDF dossier + QR** (+ instrucciones host). Sobres = preparación opcional del anfitrión. |
| “IA genera dossier” | **Fase 4+**. MVP: dossier **precreado**. |
| Interrogatorio sospechoso | MVP: **script** posible; **LLM GM Fase 5**. Sigue siendo ~10 min, no toda la partida. |
| Remoto igual que presencial | **Objetivo arquitectónico** (`POST /resume`, mismo PlayerView). Debe validarse en Fase 2–3. |
| Votación timeline 4/6 | Previsto en diseño (P3); requiere motor coop **Fase 1–2**. |
| Creator Studio completo | MVP: **mínimo** — crear sesión desde experiencia publicada/seed. |

## Coherencia con arquitectura

| Capacidad caso Sara | Spec / fase |
|---------------------|-------------|
| Guest join enlace/QR | Fase 2, `MULTIPLAYER_SPEC.md` |
| Pistas privadas filtradas | Fase 1 proyecciones + Fase 2 API |
| Comandos idempotentes, sync | Fase 2 TX Postgres |
| PDF/QR | Fase 3 assets + puzzle presentation |
| Final por flags | Fase 1 + definition P7 |
| Personalización IA | Fase 4+, explícitamente fuera MVP jugable inicial |

## Criterio de éxito (este análisis)

- Comercial: historia de cena + misterio + regalo memorable.
- UX: se entiende prep → juego → remoto → final.
- Producto: matriz Sara trazable a tests de aceptación Fase 2–3.

Ver matriz detallada: [MVP_VALIDATION_SARA.md](./MVP_VALIDATION_SARA.md).
