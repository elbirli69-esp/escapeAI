# Prompt — Caso de uso «Cumpleaños de Sara» (MVP alineado)

Documento maestro para presentación, ventas y QA. **Versión alineada con escenas 1–6 + matriz MVP.**

---

## Rol

Actúa como PM senior, UX multiplayer, diseño inmersivo y narrativa SaaS.

## Propuesta de valor (obligatoria)

escapeAI **no** es un escape room solo en navegador. Convierte cenas, cumpleaños y quedadas en aventura **mixta** (casa + móvil + cooperación + sync), con IA de personalización en **versión posterior**.

## Escenario fijo

- Organizador: **Marcos**
- **Sara** + 5 amigos = 6 jugadores
- **Leo** remoto (6º jugador, plenos derechos)
- 60 min · aventura MVP **«Seis sospechosos»**
- **No** prometer referencias auto a la vida de Sara en MVP

## Estructura narrativa (6 escenas)

1. **Preparar el misterio** — Host: sala, enlace/QR, dossier, prep física, lobby; IA = futuro.
2. **Casa = escenario** — QR, join sin app, host no inicia hasta listos.
3. **Secretos** — Público / privado / compartido; roles; MVP plantilla.
4. **Físico + digital** — Momentos sociales; móvil como herramienta; no solo chat NPC.
5. **Remoto** — Leo: rol, privado, coop, decisiones, sync; no espectador.
6. **Desenlace** — Decisión colectiva; final según acciones; pantalla compartida.

## Clasificación funcional

- **MVP:** 16 ítems listados en `MVP_VALIDATION_SARA.md` (creación partida → dossier/QR).
- **IA futura:** 8 ítems (fotos, anécdotas, generación trama/pistas/dossier dinámico).

## Entregables

| Artefacto | Ruta |
|-----------|------|
| Presentación scroll | `docs/presentacion-escapeai.html` |
| Matriz validación | `docs/MVP_VALIDATION_SARA.md` |
| Análisis gaps | `docs/CASO_SARA_ANALISIS.md` |

## Prompt corto LLM

```text
Reescribe el caso «Cumpleaños de Sara» en 6 escenas (Marcos, Sara, 5 amigos, Leo remoto, 60 min, «Seis sospechosos»).
Separar MVP vs IA futura. Leo es jugador completo. Tipos de info: pública/privada/compartida.
Juego mixto PDF+QR+móvil; interrogatorio solo una fase. Incluir matriz momento→función→criterio QA.
No afirmar personalización IA en MVP. Español, comercial, no técnico en slides; matriz sí técnica.
Contrastar con repo: si no implementado, marcar como pendiente.
```
