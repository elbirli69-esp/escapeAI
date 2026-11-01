# Prompt — Caso de uso escapeAI (presentación y producto)

Usa este prompt para reescribir el **caso de uso** de la presentación HTML, fichas comerciales o documentación. Objetivo: que quien lo lea entienda **una hora de experiencia rica**, no “60 minutos preguntando a un sospechoso”.

---

## Contexto del producto

**escapeAI** es una plataforma donde:

1. **Personalización** — La aventura puede construirse alrededor del grupo (nombres, anécdotas, fotos, lugares). Es el diferencial frente a kits genéricos y PDFs de acertijos.
2. **Juego mixto** — En la misma partida conviven **móvil** (rol, pistas privadas, cooperación, timer) y **mundo real** (dossier impreso, QR en el espacio, buscar, leer en voz alta).
3. **Multijugador cooperativo** — Cada jugador tiene información distinta; **sin compartir no se avanza**; pruebas que exigen varias personas a la vez.
4. **Roles con capacidades distintas** — No es simétrico: investigadores cruzan tiempos, criptógrafos descifran, interrogadores hablan con NPCs.
5. **Director / GM IA** — Intro, tensión, eventos a los 30 min, ritmo; más adelante narración viva (MVP puede usar guion).
6. **NPC** — Un personaje (p. ej. sospechoso) es **una fase** del misterio, no el 100% del juego.
7. **Finales ramificados** — Las decisiones del grupo cambian el desenlace.

**MVP demostrable:** *El caso de los seis sospechosos* — 6 jugadores, 7 pruebas, 6 pistas privadas, 2 cooperativas, PDF + QR, 1 interrogatorio, 1 evento timed, acusación final. Ver `fixtures/six-suspects/EXPERIENCE_DESIGN.md`.

---

## Problema a corregir

Evitar narrativas que suenen a:

- Una sola mecánica repetida (solo chat con sospechoso).
- “Escape room en app” sin físico ni mesa.
- Lista de features sin **escena** ni **emoción**.
- Ignorar que el interrogatorio es ~**10 minutos** dentro de **60**, tras descubrir pistas en papel, QR y móvil.

---

## Instrucciones de redacción

Escribe un caso de uso **cinematográfico pero claro**, público **no técnico**, segunda persona plural (“vosotros”) o tercera con nombres.

### Escenario ancla (obligatorio)

- **Organizador:** Marcos.
- **Ocasión:** Cumpleaños de **Sara**, cena en casa, **6 jugadores** (5 amigos + Sara).
- **Modalidad:** Presencial con opción de **1 amigo remoto** (mismo enlace, PDF por chat, QR en pantalla compartida).
- **Producto:** MVP usa la trama “Seis sospechosos”; **visión** explicada en 1 frase: en la versión completa Marcos sube anécdotas de Sara y la IA genera una aventura equivalente **personalizada**.

### Estructura obligatoria: 5 actos + cierre (≈60 min)

Cada acto debe incluir **al menos**:

- Qué pasa en la **habitación** (social, voz alta, risas/tensión).
- Qué pasa en el **móvil** (rol, pista privada, prueba).
- Qué pasa en lo **físico** (PDF, QR, objeto), si aplica.

| Acto | Minutos orientativos | Contenido mínimo a mencionar |
|------|----------------------|------------------------------|
| **0. Preparación** | Antes de cenar | Marcos crea sala, imprime **dossier**, coloca **QR**; invitados escanean; sensación de “algo empieza ya”. |
| **1. La escena** | 0–15 | Intro del director; **foto de la escena del crimen** en móvil; **6 pistas privadas** (coartadas); primera prueba de observación; **hay que contarlo en voz alta**. |
| **2. La mesa de evidencias** | 15–28 | **PDF** en la mesa (recortes, timeline); **QR** del pasillo aporta clave; código del ático; investigadores lideran **línea temporal** — **4 de 6 deben alinear** la secuencia (cooperación). |
| **3. Secretos y caja fuerte** | 28–42 | Criptógrafo descifra nota; dos jugadores fusionan **fragmentos de código** en prueba cooperativa; abren caja fuerte digital; a mitad de partida **llamada anónima** (evento timed) empuja al desenlace. |
| **4. Confrontación** | 42–52 | Solo entonces **interrogatorio** al sospechoso Víctor (rol interrogador + grupo escuchando); contradicción clave; **no** es el grueso de la hora. |
| **5. Veredicto** | 52–60 | **Acusación colectiva**; final distinto si pillaron la contradicción o no; Sara como protagonista emocional del regalo. |

### Checklist de potencial escapeAI (marcar todos en el texto)

- [ ] Personalización (presente o “próximo paso” con IA).
- [ ] Juego mixto PDF + QR + móvil en **la misma** partida.
- [ ] 6 pistas privadas distintas.
- [ ] 2 momentos cooperativos explícitos (timeline 4/6, caja 2+).
- [ ] 3 roles con responsabilidades distintas.
- [ ] Evento narrativo automático (min ~30).
- [ ] NPC como fase, no como totalidad.
- [ ] Final ramificado / decisión de grupo.
- [ ] Remoto incluido sin romper la magia.

### Tono

- Entusiasta pero creíble; evita jerga (API, Realtime, JSON).
- Verbos de acción: *imprimís, escaneáis, susurráis, votáis, acusáis*.
- Una frase de **contraste**: “No es un PDF de acertijos ni un chatbot de una hora”.

### Anti-patrones

- No más de **2 frases seguidas** sobre el interrogatorio.
- No omitir PDF, QR, cooperación o pistas privadas.
- No presentar la partida como solo digital.

---

## Formato de salida

### Para `presentacion-escapeai.html`

1. **Slide A — “Una hora, cinco actos”**  
   - Subtítulo cumpleaños Sara.  
   - 5–6 bloques con etiqueta de tiempo (Acto 1…5).  
   - Máx. 2 líneas por bloque + 1 línea “En el móvil / En la mesa / En casa”.

2. **Slide B — “Por qué no es un chat de 60 minutos”**  
   - Tres columnas o bullets: **Personal · Mixto · Cooperativo**.  
   - Cierre emocional 1 frase + nota remoto.

Mantener clases existentes (`use-case-step`, animaciones scroll) y no añadir barra de navegación inferior.

### Para documentación (opcional)

Markdown de 400–600 palabras, mismo arco, enlazable desde README.

---

## Criterio de éxito

Un lector debe poder responder:

1. ¿Qué hacen los jugadores **con el papel** y el **QR**?  
2. ¿Por qué **necesitan** estar los seis?  
3. ¿Cuándo entra el **sospechoso** y cuánto dura?  
4. ¿Qué recuerda **Sara** del regalo?  
5. ¿Dónde entra la **personalización** con IA?

Si alguna respuesta es vaga, reescribir el acto correspondiente.

---

## Prompt corto (copiar/pegar a un LLM)

```text
Reescribe el caso de uso de escapeAI para el cumpleaños de Sara (6 jugadores, Marcos organizador).
Sigue docs/prompt-caso-uso-escapeai.md: 5 actos en 60 minutos, MVP "Seis sospechosos" + visión IA personalizada.
Destaca personalización, juego mixto (PDF+QR+móvil), pistas privadas, 2 cooperativas, 3 roles, evento timed min 30, interrogatorio Víctor solo acto 4 (~10 min), final colectivo ramificado, amigo remoto.
Tono español, no técnico, cinematográfico. Prohibido reducir la experiencia a "preguntar al sospechoso una hora".
Salida: HTML listo para dos slides con clases use-case-step y act-time.
```
