# Producto genérico: de las respuestas iniciales a la partida

escapeAI no está pensado solo para un cumpleaños. **Cualquier ocasión** se configura con el mismo wizard; el motor **deriva códigos y textos** de forma determinista a partir de esas respuestas.

## Entradas del organizador (siempre las mismas)

| Campo | Rol en cualquier ocasión |
| ----- | ------------------------- |
| **Tipo de aventura** | Piel narrativa y assets (urbano, costa, fiesta, equipo). No cambia la lógica de códigos. |
| **Jugadores (1–20)** | Cupo del evento; una sesión por móvil. |
| **Nombre central** | Hilo del relato: persona, pareja, marca, nombre del evento («Retiro 2026», «Boda Marta y Luis»). |
| **Apodo (opcional)** | Forma corta para voz, sonido y objeto simbólico. |
| **Cifra clave (opcional)** | Número jugable: año simbólico, aniversario, dorsal, sala… No se asume “edad”. |
| **Datos jugables (facts)** | Lista libre: lugares, fechas, frases, objetos. **Prioridad** para códigos numéricos si hay un año `19xx`/`20xx`. |
| **Título del evento (opcional)** | Nombre visible; si falta, se genera del tipo + nombre central. |

## Reglas de generación (deterministas)

1. **Código numérico (4 cifras)**  
   - Primero: año de cuatro cifras en `facts`.  
   - Si no: `cifra clave` rellenada a 4 dígitos (p. ej. `25` → `0025`).  
   - Si no: derivado estable del nombre (fallback).

2. **Fragmento sonoro (2 cifras)**  
   - Primeras dos cifras del código numérico (prueba `sound` genérica).

3. **Código final (4 letras)**  
   - Iniciales/cierres del **nombre central** (persona o varias palabras del evento).

4. **Pruebas sensoriales**  
   - **Sonido / voz / cámara / visual**: mismas mecánicas; textos citan `facts` y apodo, no “cumpleaños”.

5. **Tipo de aventura**  
   - Solo altera tono, imágenes y ejemplos de `suggestedFacts` en el wizard (`birthday` es **una plantilla más**, no el centro del producto).

## Sonido (genérico)

| Patrón | Respuesta derivada de entradas |
| ------ | ----------------------------- |
| Fragmento numérico | 2 primeras cifras del código numérico |
| Contar / identificar | Definido en YAML de plantilla demo; en eventos generados, prioridad al fragmento numérico |
| Palabra clave | Palabra sacada de `facts[0]` o apodo (salas custom) |

Los clips (`audioUrl`) son contenido: ambiente, SFX o mensaje grabado; la **validación** sigue siendo `answer` en servidor.

## Qué no depende de la ocasión

- API de eventos, join code, leaderboard, narrador con nombre de jugador.  
- Catálogo YAML clásico (pilot, lighthouse, laboratorio).  
- Límite 20 jugadores y sesiones independientes.

## Extensión futura

- Campo `occasionLabel` libre (“boda”, “onboarding”, “despedida”).  
- Plantillas nuevas = solo metadata + `toneForType`, sin nuevo flujo.
