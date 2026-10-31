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
- BD: `UNIQUE(session_id, idempotency_key)` en `game_events` o tabla `command_dedup`.
- Reintento de red devuelve **misma** respuesta almacenada.

---

## Concurrencia

### Lock por sesión

Transacción:

```sql
SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE;
-- leer snapshot + events since snapshot
-- applyCommand en memoria
-- INSERT events con seq = prev + 1
-- UPDATE snapshot
COMMIT;
```

Dos respuestas simultáneas al mismo puzzle: **serializadas**; la segunda ve estado actualizado (puzzle ya solved → error amigable o no-op).

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

### Reconexión

1. Cliente pierde Realtime → polling `GET view` cada 3s en running
2. Reconecta Realtime → subscribe `session:{id}:signal`
3. `POST /api/sessions/:id/presence` `{ online: true }` opcional
4. Token inválido → pantalla “enlace expirado” (host puede regenerar slot)

### Recuperación tras reinicio servidor

- Estado = `snapshot` + replay events donde `seq > snapshot_event_seq`.
- Tests deben cubrir replay idéntico.

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
