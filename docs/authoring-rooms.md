# Guía para diseñar salas (YAML)

Las salas viven en `packages/escape-content/rooms/*.yaml` y se registran en `src/rooms.ts` (`ROOM_FILES` + `ROOM_CATALOG`).

## Flujo recomendado

1. Copia `pilot.yaml` o `lighthouse.yaml` como plantilla.
2. Define `id`, `name`, `timeLimitSec`, `startSceneId`, `winCondition`.
3. Diseña **escenas** (descripción corta, puzzles activos, objetos en escena, salidas).
4. Define **puzzles** con pistas en 3 niveles cuando sea posible.
5. Ejecuta `pnpm validate-rooms` y `pnpm test` (o añade un recorrido e2e en `rooms.test.ts`).
6. Registra la sala en `ROOM_CATALOG` con título y resumen para la PWA.

## Esquema mínimo

```yaml
id: my_room          # debe coincidir con la clave en ROOM_FILES
name: Nombre visible
timeLimitSec: 3600
startSceneId: first
items:
  key_a:
    name: Llave oxidada
    description: Texto para autor/IA; no se muestra tal cual al jugador aún.
winCondition:
  type: puzzle_solved
  puzzleId: final_puzzle
scenes:
  first:
    id: first
    title: Título en UI
    description: >
      Texto de ambientación (puede incluir pistas suaves).
    puzzles: [door_code]
    items: [key_a]          # opcional, en el suelo de la escena
    exits:
      - toSceneId: second
        label: Abrir la puerta
        when:
          type: puzzle_solved
          puzzleId: door_code
puzzles:
  door_code:
    id: door_code
    type: code
    prompt: Lo que ve el jugador.
    answer: "42"
    normalize: uppercase    # opcional: uppercase | lowercase | trim
    maxHints: 3
    hints:
      - level: 1
        text: Pista vaga (sin solución literal).
      - level: 2
        text: Más concreta.
      - level: 3
        text: Casi solución (solo en YAML estático).
```

## Tipos de puzzle

| type | Uso | Campos |
| ---- | --- | ------ |
| `code` | Respuesta escrita | `answer`, `normalize` opcional |
| `inventory` | Usar objeto del inventario | `requiresItem` (id de `items`) |

## Acciones del jugador (motor)

| Acción API | Cuándo |
| ---------- | ------ |
| `submit_answer` | Puzzles `code` |
| `take_item` | Objeto listado en `sceneItems` |
| `use_item` + `puzzleId` | Puzzles `inventory` |
| `move` | Cuando la salida está `available` |
| `request_hint` | Consume siguiente pista del YAML |

## Condiciones de salida / victoria

```yaml
when:
  type: puzzle_solved
  puzzleId: some_id
# o
when:
  type: has_item
  itemId: key_a
```

## Buenas prácticas

- **Lineal al inicio:** 3–4 escenas hasta dominar el formato.
- **Un puzzle activo por escena** cuando puedas (menos confusión en móvil).
- **Pistas 1–3** escritas por humano; la IA solo parafrasea atmósfera (`apps/api/src/orchestrator.ts`).
- **No** pongas `answer` en descripciones de escena visibles si evitas spoilers en cliente (hoy el YAML solo corre en servidor).
- Añade un test e2e con la solución esperada para no romper la sala en refactors.

## Comprobación

```bash
pnpm validate-rooms   # estructura y catálogo
pnpm test             # recorridos e2e en rooms.test.ts
```

## Registrar en la app

En `packages/escape-content/src/rooms.ts`:

```typescript
export const ROOM_FILES = {
  // ...
  my_room: "my_room.yaml",
} as const;

export const ROOM_CATALOG = [
  // ...
  { id: "my_room", title: "…", summary: "…" },
];
```

Tras `pnpm build`, `GET /rooms` y el selector PWA mostrarán la nueva sala.
