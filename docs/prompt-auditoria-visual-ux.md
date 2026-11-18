# Prompt: auditoría visual y UX de escapeAI (objetivo 10/10)

## Rol

Eres **auditor UX/UI senior** especializado en productos móviles-first, PWA y experiencias inmersivas (escape rooms). Evalúas **escapeAI** en producción o preview real, sin asumir el código: solo lo que ves y puedes hacer en pantalla.

## Contexto del producto

- **Lobby**: modos (escanear, crear evento, entrar, organizador, catálogo) con tarjetas visuales.
- **Eventos**: wizard de plantillas (celebración, homenaje, misterio, reto) → código + QR.
- **Catálogo**: salas YAML (pilot, lighthouse, labs).
- **Partida**: escena hero, puzzles, diario, GM, tema urban/coastal.

## Instrucciones de ejecución (obligatorias)

1. Abre la URL de producción indicada en **viewport móvil 390×844** y repite **puntos críticos** en **1280×800** (organizador/TV).
2. Captura **screenshot** de cada pantalla evaluada (home, crear, catálogo, una partida corta si es posible sin credenciales).
3. Recorre **máximo 3 flujos** en 15 min:
   - **A** Inicio → Crear experiencia → elegir plantilla (no hace falta enviar formulario completo).
   - **B** Inicio → Catálogo clásico → seleccionar sala.
   - **C** Inicio → Entrar como equipo (solo comprobar claridad del formulario).
4. Anota **fricciones concretas** (texto, tap target, contraste, jerarquía, estados de carga, errores).
5. Puntúa cada dimensión **0–10** con una frase de evidencia y **1–3 acciones** para subir +1 punto.

## Rúbrica (pesos)

| ID | Dimensión | Peso | Qué mirar |
|----|-----------|------|-----------|
| V1 | **Identidad y atmósfera** | 15% | ¿Se siente escape room / fiesta multi-equipo? Temas urban/coastal coherentes. |
| V2 | **Jerarquía visual** | 15% | Título → imagen → acción; sin muro de texto; Fraunces/display vs cuerpo. |
| V3 | **Tarjetas y fotos** | 15% | Portadas distintas, relevantes, sin flash/cambio brusco; alt y recorte. |
| V4 | **Densidad y ritmo** | 10% | Espaciado, compact vs default, scroll en móvil, grid legible. |
| V5 | **Contraste y accesibilidad** | 15% | Texto sobre gradientes, focus visible, tamaño táctil ≥44px, reduced motion. |
| U1 | **Claridad de tareas** | 15% | ¿Usuario sabe qué hacer en 5 s en cada pantalla? |
| U2 | **Flujo y recuperación** | 10% | Volver atrás, errores, estados vacíos/carga, QR/código visible. |
| U3 | **Consistencia** | 5% | Mismos patrones entre home, plantillas y catálogo. |

**Nota global** = Σ (nota × peso). Redondeo 1 decimal.

## Criterios 10/10 (referencia)

- **V1**: Tema perceptible en lobby y partida; cero sensación “formulario admin”.
- **V2**: Una acción primaria obvia por vista; copy emocional ≤2 líneas por tarjeta.
- **V3**: Todas las tarjetas con foto temática única; carga con placeholder elegante.
- **V4**: Sin scroll horizontal; 1 columna móvil cómoda; chips meta escaneables.
- **V5**: WCAG AA en textos críticos; focus ring visible; sin texto ilegible en posters.
- **U1**: Modos del home autoexplicativos sin leer párrafo largo.
- **U2**: Crear evento en &lt;6 taps hasta ver código; join con código en primer plano.
- **U3**: Misma tarjeta `VisualCard` en home, plantillas y salas.

## Formato de salida (copiar al informe)

```markdown
# Informe auditoría escapeAI — {fecha}
URL: {url}
Viewports: móvil + escritorio

## Puntuación
| Dimensión | Nota | Evidencia breve |
...

**Global: X.X / 10**

## Top 5 mejoras (impacto × esfuerzo)
1. ...

## Backlog P0 → P3
### P0 (bloquea percepción de calidad)
...

## Capturas
- {ruta o descripción}
```

## Uso con agente / humano

- Pegar este prompt + URL (`https://escapeai-self.vercel.app` o dominio custom).
- Adjuntar capturas al informe en `docs/informes/` o PR.
- Re-ejecutar tras cada sprint visual; meta: **≥9.0** en V3 y U1 antes de lanzamiento público.