# Estudio — Escape rooms online gratis (Escape Room Lover)

**Fuente:** [70 Escape Rooms Online GRATIS](https://www.escaperoomlover.com/es/escape-room-online-gratis) (campaña #YoEscapoEnCasa, 2020).  
**Inventario:** 45 títulos extraídos del HTML en noviembre de 2026 (la página anuncia 70; el resto puede estar retirado o en otra sección).  
**Uso:** ideas mecánicas y narrativas para **escapeAI**, sin replicar webs externas.

---

## 1. Qué es este catálogo (vs escapeAI)

| | Escape Room Lover | escapeAI |
|--|-------------------|----------|
| **Producto** | Enlaces a juegos aislados (Genially, Drive, webs propias) | Motor + PWA + API unificados |
| **Personalización** | Fija por autor | `facts`, scan, `adventureType` |
| **Físico** | Opcional (imprimir, sala en casa) | Scanner, GPS, props, P5 híbrido |
| **Multijugador** | Videollamada / 2–12 en algunos | Eventos N equipos, leaderboard |
| **GRATIS** | Sí (marketing hacia salas reales) | Demo plantillas posibles (P6-C) |

---

## 2. Taxonomía de clusters (45 juegos)

| Cluster | Ejemplos | N ≈ |
|---------|----------|-----|
| **Cluedo / investigación** | Firulais, Justicia criminal, Investigando Covid, Un dulce crimen, La oficina, La desaparición | 8 |
| **Asimétrico / info repartida** | La cura 1–2, Suero Javinski, Sadness Epidemic | 3 |
| **Familiar / fácil** | Toda una vida, Michelón, Laboratorios Illa | 3 |
| **Sci-fi / distopía** | Planeta Pi, Pandemia, A.I. Takeover, Misiones retorno/rescate | 5 |
| **Mystery / thriller** | Visión, Heartbleed, La cabaña, ¿Qué le sucede a Cris? | 4 |
| **Cultural / tour** | Prado, Renacimiento, Egipto, Sant Jordi | 4 |
| **Humor / absurdo** | Carlinos, Emergencia gatuna, Código alienígena | 3 |
| **Romance / social** | Romeo y Julieta | 1 |
| **Horror / audio** | Melodía maldita | 1 |
| **Mansión / fortuna** | Manfredi | 1 |
| **Fan IP** | Hogwarts Digital | 1 |
| **Histórico** | Interception | 1 |
| **Escape book (ramas)** | Cambio de piel | 1 |
| **Stay room (concepto)** | Legado del Escapista | 1 |
| **Puzzle puro** | Escape Rubick | 1 |
| **Pop culture** | Las series me persiguen | 1 |
| **Oculto / mapas** | Mapa de un sueño | 1 |
| **Anomalía / tiempo** | El Limonero | 1 |
| **Sin desc.** | Boom | 1 |

---

## 3. Patrones mecánicos (transversales)

1. **Hub navegable** — edificio, laboratorio, países → **site** / escenas + mapa.  
2. **Dependencias en grafo** — “habla con 2ºB antes de 1ºB” → `when` + `grantClue` + orden en hints.  
3. **Contraseña / URL como llave** → `joinCode`, QR, puzzles `code` (no enlaces externos obligatorios).  
4. **Vídeo YouTube como ayuda** → sustituir por hints en app o GM; opcional enlace en copy.  
5. **Búsqueda en web/redes** → sustituir por **facts del wizard**, geo quiz, flavor LLM.  
6. **Imprimir + QR + calculadora** → P5 prep organizador + `camera:qr_scan` + puzzles `code`.  
7. **Deducción final (whodunit)** → no modelado en generados; **P6-A**.  
8. **Cada jugador ve distinta pista** → **P6-B** (roles / slots).  
9. **Saga parte 1 / 2** → mismo `eventId`, acto desbloqueable.  
10. **Dificultad y jugadores en ficha** → `difficulty`, `timeLimitSec`, copy en lobby.

---

## 4. Inventario juego → idea escapeAI

| # | Título ERL | Idea principal para escapeAI |
|---|------------|------------------------------|
| 1 | Buscando a Firulais | Site multi-estancia + finale deducción + QR físico |
| 2 | Planeta Pi | `team` + ranking tiempo; stakes narrativos |
| 3 | Los misterios del Prado | `visual` + facts como “obras”; tono mystery |
| 4 | La fortuna de Manfredi | Site recorrido mansión |
| 5 | Toda una vida | `birthday` relaxed; epílogo emocional |
| 6 | La guía Michelón | Demo gratis lobby 20 min, 1–2p |
| 7–8 | Misión retorno / rescate | Fase 2 evento opcional |
| 9 | Mapa de un sueño | `spatialSiteMap` + geo / lugar oculto |
| 10 | Pandemia | Evitar tema; usar sci-fi genérico |
| 11 | Interception | Catálogo YAML histórico one-shot |
| 12 | La leyenda del duende | celebration fácil + GM |
| 13 | Visión | Paquete inicial + mystery |
| 14 | Hogwarts Digital | No IP; mecánica “equipos/casas” genérica |
| 15 | La oficina | Extender **pilot** (finanzas, sospechosos) |
| 16 | El diario de Tolok | Beats + clue ledger |
| 17–18 | La cura del virus 1–2 | P6-B roles; eventos 2–12 equipos |
| 19 | Laboratorios Illa | **interactive-lab** como onboarding |
| 20 | A.I. Takeover | Flavor GM |
| 21 | La melodía maldita | `sound` + tensión temporal |
| 22 | ¿Qué le sucede a Cris? | Arco mystery largo |
| 23 | La cabaña | GM `TIME_WARNING` / stuck |
| 24 | Suero Javinski | P6-B: 2–4 roles, 6 mini-puzzles repartidos |
| 25 | Boom | Verificar enlace |
| 26 | Romeo y Julieta | celebration + `voice` |
| 27 | Sadness Epidemic | 3 “regiones” = geo quiz desde facts |
| 28–29 | Carlinos / Emergencia gatuna | Humor en copy team/celebration |
| 30 | Un dulce crimen | P6-A whodunit |
| 31 | Cambio de piel | Ramas: roadmap largo plazo |
| 32 | Legado del Escapista | Reforzar scanner + físico (vuestra USP) |
| 33 | Sant Jordi | Plantilla seasonal |
| 34 | Heartbleed | mystery + `location` urbano |
| 35 | Escape Rubick | Fuera del motor ER |
| 36 | Justicia criminal | P6-A + multiequipo |
| 37–38 | Renacimiento / Egipto | Site cultural multi-acto |
| 39 | El ladrón de cuadros | `camera` + `visual` |
| 40 | Investigando Covid | Plantilla 4 sospechosos generada |
| 41 | Las series me persiguen | `facts` como guiños en hints |
| 42 | El Limonero | Arquetipo `temporal` espacial |
| 43 | Código alienígena | Narrador GM + `sound` |
| 44 | La desaparición | mystery + notebook |

---

## 5. Backlog priorizado (escapeAI)

| Prioridad | Iniciativa | Inspiración ERL | Encaje técnico actual |
|-----------|------------|-----------------|------------------------|
| **1** | P6-A Whodunit en generado | Firulais, Justicia criminal, Investigando Covid | `grantClue`, mystery type, UI nueva |
| **2** | P6-B Roles asimétricos | Cura virus, Suero Javinski | `teamVariable`, filtrar pistas por slot |
| **3** | P5-C Ficha + demo lobby | Michelón, Toda una vida | `prepChecklist`, plantilla catálogo |
| **4** | Pilot “oficina” ampliada | La oficina | YAML + personaje GM |
| **5** | Saga 2 actos | Misión rescate | Misma sesión/evento, escena bloqueada |
| **6** | Cultural visual | Prado, Renacimiento | `visual` + Pexels queries temáticas |
| **7** | Horror pacing | Cabaña, Melodía | GM + sound (sin IP externa) |

**No priorizar (v1):** fan IP (Hogwarts), escape book ramificado, Rubik minijuego, OSINT real en Instagram, 25 enlaces rotos a imitar.

---

## 6. Diferenciación defendible

Lo que el listado ERL **casi nunca** junta y escapeAI **sí** puede:

- Misma partida **personalizada** (nombre, facts, semilla).  
- **Varios equipos** con ranking en paralelo.  
- **Sala escaneada** → puzzles derivados de objetos reales.  
- **GM adaptativo** (ritmo, híbridos, compress).  
- **Sensores** móviles validados en servidor.  
- **Híbrido** casa (P5) con auditoría (`audit-fisico`).

---

## Referencias

- [prompt-entretenimiento-er.md](./prompt-entretenimiento-er.md) — P5, P6  
- [prompt-inventario-fisico.md](./prompt-inventario-fisico.md)  
- [prompt-coherencia-partidas.md](./prompt-coherencia-partidas.md)