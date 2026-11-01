# Multiplayer Specification — escapeAI

Alcance inicial: **2–10 jugadores**, una sesión = una sala, organizador = host con cuenta.

## Objetivos

- Sincronización fiable con **servidor autoritativo**.
- **Aislamiento** de pistas privadas y soluciones.
- **Idempotencia** y orden total de eventos por sesión.
- **Reconexión** sin corrupción de estado.
- Simplicidad operativa en MVP (sin cluster propio de WebSockets).

---

## Comparativa: Realtime vs WebSockets vs Ably

| Criterio | Supabase Realtime | WebSocket propio (Node) | Ably / Pusher |
|----------|-------------------|-------------------------|---------------|
| Complejidad MVP | Baja | Alta en serverless | Media |
| Vercel compatible | Sí (cliente Realtime + API) | Requiere servicio aparte | Sí |
| Presencia | Broadcast + heartbeat API | Custom | Nativo |
| Coste inicial | Incluido en Supabase | Infra + ops | Uso variable |
| Control fino privacidad | Requiere patrón pull/filter | Total | Canales por jugador |
| Escala 10 jugadores × N salas | Suficiente | Suficiente | Suficiente |

### Decisión MVP (ver ADR-003)

**Supabase Realtime** para **señales** (`session:{id}:signal`) + **HTTPS** para vistas filtradas y comandos.

**Cuándo cambiar**

- >500 salas concurrentes con picos de mensajes → evaluar Ably o canal dedicado WS.
- Latencia sub-50ms crítica en minijuegos → WS dedicado por sesión.
- Requisitos enterprise de compliance que prohíban clientes Realtime directos → SSE desde API + CDN.

---

## Modelo de comunicación

### Capas

1. **Command API** (mutaciones): `POST /api/sessions/:sessionId/commands`
2. **View API** (lecturas autorizadas): `GET /api/sessions/:sessionId/view`
3. **Signal channel** (Realtime): notificación ligera post-commit

### Payload de señal (público, sin secretos)

```typescript
type SessionSignal = {
  kind: "state_changed";
  sessionId: string;
  seq: number;
  summary: {
    status: SessionStatus;
    phaseId: string;
    version: number; // bump en cada commit
  };
};
```

Cliente: si `seq > localSeq` → fetch view.

Opcional Fase 2.1: señal `player:{playerId}` con mismo esquema para reducir polling cruzado.

---

## Comandos HTTP

```typescript
// Request
{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "command": { "type": "SUBMIT_PUZZLE_ANSWER", ... }
}

// Response 200
{
  "seq": 42,
  "events": [ /* GameEvent públicos */ ],
  "view": { /* PlayerViewDTO */ }
}

// Response 409 — conflicto de versión (reintentar con view refresh)
// Response 422 — comando inválido
```

Headers:

- Jugador: `Authorization: Bearer <player_session_token>`
- Host (dashboard): cookie Supabase + `session.host_user_id` match

---

## Idempotencia

- Cliente genera `idempotencyKey` UUID por acción de usuario.
- Tabla **`command_responses`** (ver `DATA_MODEL.md`): `UNIQUE(session_id, idempotency_key)` → respuesta HTTP cacheada.
- Reintento de red devuelve **misma** respuesta sin re-ejecutar motor (ni incrementar `seq`).

---

## Transacción PostgreSQL (operación crítica)

Toda mutación de partida pasa por **`SessionCommandService.execute`** en una **única transacción** serializable por fila de sesión.

### Columnas auxiliares en `game_sessions`

| Columna | Uso |
|---------|-----|
| `last_event_seq` | bigint, último seq asignado (default 0) |
| `snapshot_json` | estado materializado del motor |
| `snapshot_event_seq` | seq hasta el cual el snapshot es válido |

### Pasos (orden fijo)

```text
BEGIN;
  1. SELECT game_sessions ... WHERE id = $sessionId FOR UPDATE;
  2. Idempotencia: SELECT command_responses WHERE session_id AND idempotency_key;
       → si existe: COMMIT; return cached;
  3. AuthZ (servidor, antes de motor):
       - token → player_id; token_version; session_id match;
       - comando permitido para actor (host vs player);
  4. Cargar GameDefinition (game_versions.definition_json) — solo servidor;
  5. Reconstruir estado:
       - si snapshot_event_seq < last_event_seq: replay eventos (seq > snapshot_event_seq);
       - else: deserialize snapshot_json;
  6. Validación de estado (motor):
       - status permite comando (ej. SUBMIT solo en running);
       - fase/puzzle no locked; dependencias;
  7. Validación de respuesta (motor, si SUBMIT/COOP):
       - permisos rol/slot; estrategia determinista; NO expone solución al cliente;
  8. applyCommand → { newState, events[] };
  9. Para cada evento emitido:
       - last_event_seq := last_event_seq + 1; asignar seq al evento;
       - INSERT game_events (session_id, seq, type, payload_json, actor_player_id, idempotency_key solo en primero);
  10. Actualizar puzzle_states / player_clues / inventory tablas derivadas (cache);
  11. UPDATE game_sessions SET snapshot_json, snapshot_event_seq = last_event_seq,
        status, phase_id, timer fields, last_event_seq;
  12. INSERT command_responses (session_id, idempotency_key, http_status, body_json);
COMMIT;
  13. Post-commit (fuera de TX): broadcast Realtime signal { seq, status, phaseId };
  14. Construir PlayerViewDTO / HostViewDTO desde newState (strip secrets);
  15. return { seq, eventsPublic, view };
```

**Reglas**

- Pasos 1–12 son atómicos. Si el motor rechaza → `ROLLBACK`, sin fila en `command_responses` (el cliente puede reintentar con **nueva** idempotency key si fue error lógico, o la misma si hubo timeout de red tras commit — ver abajo).
- `payload_json` en eventos **nunca** incluye respuestas correctas ni contenido de pistas ajenas.
- Host usa cookie Supabase; **no** pasa por guest token pero misma TX y lock.

### Idempotencia vs timeout

| Escenario | Comportamiento |
|-----------|----------------|
| Cliente reenvía misma key | Paso 2 devuelve `body_json` cacheado |
| Commit OK, respuesta HTTP perdida | Reintento misma key → misma respuesta (paso 2) |
| Error 422 validación | No cache (opcional cache negativo 60s para evitar spam) |

---

## Concurrencia

### Serialización

`FOR UPDATE` en `game_sessions` garantiza **un comando activo por sesión**. Dos HTTP concurrentes se encolan a nivel Postgres; no hay merge optimista en el cliente.

### Ejemplo: dos jugadores, misma prueba, mismo instante

**Contexto:** P1 `scene_observation` público; A y B envían `SUBMIT_PUZZLE_ANSWER` con respuesta correcta `reloj roto`.

| Orden | Transacción A | Transacción B |
|-------|---------------|---------------|
| T0 | `FOR UPDATE` adquiere lock | espera lock |
| T1 | Valida: puzzle available | (espera) |
| T2 | Correcto → `puzzle.solved`, seq=41 | (espera) |
| T3 | COMMIT; lock libre | adquiere lock |
| T4 | — | Replay incluye solved P1 |
| T5 | — | Valida: puzzle ya solved → `EngineError: PUZZLE_ALREADY_SOLVED` **o** idempotente no-op si misma respuesta duplicada del mismo player (config: mismo player re-submit = 200 no-op; otro player = 200 con view actualizada sin nuevo evento) |

**Decisión cerrada:** solo **un** evento `puzzle.solved` por puzzle. Segundo jugador recibe **200** con `view` actualizada y lista de eventos vacía o `puzzle.already_solved` en payload público; **no** segundo punto de progreso.

### Cooperación (distintos puzzles)

A en P5 coop y B en P4 cifrado: serializados pero independientes; estado tras A visible en replay de B.

---

## Seguridad de lectura (View API)

Ver `ARCHITECTURE.md` § Seguridad y `TESTING_STRATEGY.md` § Aislamiento. Resumen:

- Solo `GET /view` y respuestas de comando incluyen datos de jugador; nunca definición completa.
- Realtime **no** transporta pistas ni soluciones.

### Cooperación multi-jugador

Estado parcial en `puzzle_states.data_json`:

```typescript
{
  "contributions": {
    "playerUuidA": { "clueId": "..." },
    "playerUuidB": { "code": "..." }
  }
}
```

Comando `COOP_PUZZLE_CONTRIBUTE` mergea; validación final cuando `minDistinctPlayers` satisfecho.

---

## Flujos MVP

### Crear sala

1. Host autenticado → `POST /api/experiences/:id/sessions`
2. Crea `game_sessions` (status `lobby`), `invite_code`, slots vacíos
3. Devuelve URL `/join/{inviteCode}` + QR

### Unirse (guest)

1. `GET /api/join/:inviteCode` → metadata pública (título, slots libres)
2. `POST /api/join/:inviteCode` `{ displayName, slot? }`
3. Servidor crea `players`, genera token **una sola vez** en respuesta
4. Cliente guarda token en `sessionStorage`

### Roles

- Auto: host configura `autoAssignRoles: true` → al `running`, motor asigna por shuffle determinista con seed `sessionId`.
- Manual: `PLAYER_CLAIM_ROLE` en lobby (first-come unique).

### Inicio

- Host: `HOST_START` → transición `ready` → `running`, distribución de `player_clues` según roles, timer inicia.

### Pistas privadas

- En `running`, motor emite grants en eventos; contenido solo en view del jugador asignado.
- `SHARE_CLUE`: valida `shareable`; emite `clue.shared`; otros ven contenido en siguiente view.

### Temporizador

- Servidor calcula elapsed usando `timer_elapsed_sec` + (now - started_at) si not paused.
- Cliente muestra estimación; **eventos** `timer.paused/resumed` autoritativos.
- Eventos programados (`timedEvents`) evaluados por job cron cada 30s o en cada comando (MVP: en cada comando + host tick).

### Reconexión (procedimiento cerrado)

**Principio:** el estado autoritativo siempre se obtiene por **HTTPS + proyección servidor**. Realtime es opcional y **sin buffer histórico**; no se “recuperan” señales perdidas.

Cliente persiste en `sessionStorage`: `playerToken`, `sessionId`, `lastSeq` (hint UI).

#### Al volver a entrar (misma pestaña o nueva)

```http
POST /api/sessions/:sessionId/resume
Authorization: Bearer <playerToken>
Body: { "clientLastSeq": 42 }  // informativo
```

**Servidor (sin Realtime):**

1. Validar token + `token_version` + sesión no `cancelled`.
2. Carga lectura: snapshot + replay eventos hasta `last_event_seq` (sin lock salvo mantenimiento).
3. `projectPlayerView(state, definition, playerId)`.
4. Calcular `timer` autoritativo en servidor.
5. Responder:

```typescript
{
  seq: number;              // last_event_seq actual
  serverTime: string;       // ISO
  view: PlayerViewDTO;
  publicEvents: GameEvent[]; // eventos con seq > clientLastSeq y tipo público
}
```

6. `UPDATE players SET connection_status = 'online', last_seen_at = now()`.

#### Cliente tras resume

1. Reemplazar estado local con `view`; fijar `lastSeq = seq`.
2. Suscribir Realtime `session:{id}:signal` (si disponible).
3. En cada señal con `seq > lastSeq`: llamar **`resume`** de nuevo (MVP).
4. Fallback: polling `resume` cada 3s si Realtime caído >10s.

**Garantías:** pistas privadas vienen de BD vía proyección; eventos Realtime perdidos no afectan si se llama a `resume` al abrir.

#### Token inválido / revocado

HTTP 401 → “Sesión expirada”; host regenera token (`POST .../players/:id/rotate-token`).

### Recuperación tras reinicio servidor

Idéntico a `resume`: snapshot + replay en Postgres; ningún estado en memoria de proceso.

---

## Permisos (matriz resumida)

| Acción | Host | Player |
|--------|------|--------|
| Ver soluciones | No (solo motor interno) | No |
| Pausar / cancelar | Sí | No |
| Start | Sí | No |
| Submit answer | No | Sí (puzzles propios/globales) |
| Share clue | No | Sí (propias shareable) |
| Ver pistas ajenas privadas | No | No |
| Ver progreso global | Sí (dashboard) | Parcial (equipo) |

---

## Guest token

- Generación: 32 bytes random → base64url; almacenar `hash(token)`.
- Claims implícitos: `session_id`, `player_id`, `token_version`.
- Revocación: increment `token_version` en player row.
- No JWT en MVP (opaco más simple); Fase 6 puede migrar a JWT firmado corto.

---

## Testing multiplayer

Harness en `packages/game-engine` o `apps/web/test`:

```typescript
async function withPlayers(count: number, fn: (clients: SimClient[]) => Promise<void>);
```

Escenarios obligatorios:

- Doble submit mismo idempotencyKey → una mutación
- Submit simultáneo mismo puzzle → un solved
- Disconnect mid-command → retry idempotente
- Share clue → otro jugador ve en view
- Host pause → timer congelado para todos

---

## Límites MVP

- Sin chat libre entre jugadores (solo share + GM IA fase 5).
- Sin espectadores anónimos.
- Una partida activa por invite_code (no reutilizar código tras completed).
