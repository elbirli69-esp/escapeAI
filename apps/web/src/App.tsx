import type { OrchestratorResponse, PublicItem, PublicState } from "@escapeai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createSession, fetchRooms, fetchState, sendAction, type RoomSummary } from "./api";

function themeClass(theme?: string): string {
  return theme === "coastal" ? "theme-coastal" : "theme-urban";
}

function FlashBanner(props: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flash-banner" role="alert">
      <span>{props.message}</span>
      {props.onDismiss && (
        <button
          type="button"
          className="flash-dismiss"
          onClick={props.onDismiss}
          aria-label="Cerrar"
        >
          ×
        </button>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SceneHero(props: { image?: string; title: string; mood?: string }) {
  return (
    <figure className="scene-hero">
      {props.image ? (
        <img src={props.image} alt="" className="scene-hero-img" loading="eager" />
      ) : (
        <div className="scene-hero-placeholder" aria-hidden />
      )}
      <figcaption className="scene-hero-caption">
        <h2 className="scene-hero-title">{props.title}</h2>
        {props.mood && <p className="scene-hero-mood">{props.mood}</p>}
      </figcaption>
    </figure>
  );
}

function ProgressRail(props: { order: string[]; current: string; theme?: string }) {
  const idx = props.order.indexOf(props.current);
  return (
    <nav className="progress-rail" aria-label="Progreso por escenas">
      {props.order.map((id, i) => (
        <span
          key={id}
          className={
            i < idx ? "progress-dot done" : i === idx ? "progress-dot active" : "progress-dot"
          }
          title={id}
        />
      ))}
    </nav>
  );
}

function ItemCard(props: {
  item: PublicItem;
  variant: "inventory" | "scene";
  busy: boolean;
  onTake?: () => void;
  onUse?: () => void;
}) {
  return (
    <article className="item-card">
      <div className="item-icon" aria-hidden>
        {props.variant === "inventory" ? "🎒" : "✦"}
      </div>
      <div className="item-body">
        <strong>{props.item.name}</strong>
        {props.item.description && <p>{props.item.description}</p>}
      </div>
      {props.variant === "scene" && props.onTake && (
        <button type="button" className="chip chip-action" disabled={props.busy} onClick={props.onTake}>
          Coger
        </button>
      )}
      {props.variant === "inventory" && props.onUse && (
        <button type="button" className="ghost sm" disabled={props.busy} onClick={props.onUse}>
          Usar
        </button>
      )}
    </article>
  );
}

function RoomPicker(props: {
  rooms: RoomSummary[];
  loading: boolean;
  error: boolean;
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  busy: boolean;
  startError: string | null;
  onStart: () => void;
}) {
  const selected = props.rooms.find((r) => r.id === props.selectedRoomId);

  return (
    <main className={`shell lobby ${selected ? themeClass(selected.theme) : ""}`}>
      <header className="lobby-hero">
        <p className="eyebrow">escapeAI · salas online</p>
        <h1 className="display">Encuentra la salida</h1>
        <p className="lede">
          Explora, combina objetos y descifra códigos. El motor decide; el narrador
          opcional acompaña con pistas.
        </p>
      </header>

      {props.startError && <FlashBanner message={props.startError} />}
      {props.loading && <p className="muted">Cargando salas…</p>}
      {props.error && (
        <p className="error">No se pudo cargar el catálogo. ¿Está la API en marcha?</p>
      )}

      <ul className="room-grid">
        {props.rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              className={
                room.id === props.selectedRoomId ? "room-card-v2 active" : "room-card-v2"
              }
              onClick={() => props.onSelectRoom(room.id)}
            >
              <div className="room-card-media">
                {room.coverImage ? (
                  <img src={room.coverImage} alt="" loading="lazy" />
                ) : (
                  <div className="room-card-fallback" />
                )}
              </div>
              <div className="room-card-copy">
                <strong>{room.title}</strong>
                {room.tagline && <span className="room-tagline">{room.tagline}</span>}
                <span className="meta">
                  {room.sceneCount ?? "—"} escenas · {Math.round(room.timeLimitSec / 60)} min
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="primary wide"
        disabled={props.busy || props.rooms.length === 0}
        onClick={props.onStart}
      >
        {props.busy ? "Preparando sala…" : "Empezar partida"}
      </button>
    </main>
  );
}

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem("escapeai.sessionId"),
  );
  const [selectedRoomId, setSelectedRoomId] = useState("pilot");
  const [answer, setAnswer] = useState("");
  const [selectedPuzzle, setSelectedPuzzle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [narrator, setNarrator] = useState<OrchestratorResponse | null>(null);
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
    enabled: !sessionId,
  });

  const startGame = useMutation({
    mutationFn: (roomId: string) => createSession(roomId),
    onSuccess: (data, roomId) => {
      localStorage.setItem("escapeai.sessionId", data.sessionId);
      localStorage.setItem("escapeai.roomId", roomId);
      setSessionId(data.sessionId);
      setNarrator(null);
      setActionError(null);
      queryClient.setQueryData(["state", data.sessionId], data.state);
    },
  });

  const stateQuery = useQuery({
    queryKey: ["state", sessionId],
    queryFn: () => fetchState(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => (q.state.data?.status === "playing" ? 15_000 : false),
  });

  const actionMutation = useMutation({
    mutationFn: (action: Parameters<typeof sendAction>[1]) =>
      sendAction(sessionId!, action),
    onSuccess: (result) => {
      queryClient.setQueryData(["state", sessionId], result.state);
      if (!result.ok && result.error) setActionError(result.error);
      else setActionError(null);
      if (result.orchestrator) setNarrator(result.orchestrator);
    },
    onError: () => setActionError("No se pudo contactar con el servidor. Reintenta."),
  });

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(t);
  }, [actionError]);

  const state = stateQuery.data;

  const activePuzzleId = useMemo(() => {
    if (!state) return null;
    const open = state.puzzles.find((p) => !p.solved);
    return selectedPuzzle ?? open?.id ?? null;
  }, [state, selectedPuzzle]);

  if (!sessionId) {
    return (
      <RoomPicker
        rooms={roomsQuery.data ?? []}
        loading={roomsQuery.isLoading}
        error={roomsQuery.isError}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        busy={startGame.isPending}
        startError={
          startGame.isError ? "No se pudo crear la partida. Comprueba la API." : null
        }
        onStart={() => startGame.mutate(selectedRoomId)}
      />
    );
  }

  if (stateQuery.isLoading || !state) {
    return (
      <main className="shell">
        <p className="muted">Cargando sesión…</p>
      </main>
    );
  }

  return (
    <GameView
      state={state}
      activePuzzleId={activePuzzleId}
      answer={answer}
      onAnswerChange={setAnswer}
      onSelectPuzzle={setSelectedPuzzle}
      onAction={(action) => actionMutation.mutate(action)}
      busy={actionMutation.isPending}
      actionError={actionError}
      onDismissError={() => setActionError(null)}
      narrator={narrator}
      onNewGame={() => {
        localStorage.removeItem("escapeai.sessionId");
        localStorage.removeItem("escapeai.roomId");
        setSessionId(null);
        setSelectedPuzzle(null);
        setNarrator(null);
        setActionError(null);
      }}
    />
  );
}

function GameView(props: {
  state: PublicState;
  activePuzzleId: string | null;
  answer: string;
  onAnswerChange: (v: string) => void;
  onSelectPuzzle: (id: string) => void;
  onAction: (action: Parameters<typeof sendAction>[1]) => void;
  busy: boolean;
  actionError: string | null;
  onDismissError: () => void;
  narrator: OrchestratorResponse | null;
  onNewGame: () => void;
}) {
  const { state } = props;
  const sceneOrder = state.sceneOrder?.length
    ? state.sceneOrder
    : [state.currentSceneId];
  const inventoryItems = state.inventoryItems ?? [];
  const sceneItemItems = state.sceneItemItems ?? [];
  const activePuzzle = state.puzzles.find((p) => p.id === props.activePuzzleId);
  const sceneIdx = sceneOrder.indexOf(state.currentSceneId);
  const progress = Math.round(
    (Math.max(0, sceneIdx) / Math.max(1, sceneOrder.length - 1)) * 100,
  );

  return (
    <main className={`shell game ${themeClass(state.roomTheme)}`}>
      <header className="game-head">
        <div>
          <p className="eyebrow">{state.roomName}</p>
          <div className="title-row">
            <h1 className="display-sm">{state.sceneTitle}</h1>
            {props.narrator && props.narrator.source !== "fallback" && (
              <span className="narrator-badge" title={props.narrator.message}>
                Narrador IA
                {props.narrator.source === "deepseek" ? " · DeepSeek" : ""}
              </span>
            )}
          </div>
          <ProgressRail order={sceneOrder} current={state.currentSceneId} />
        </div>
        <div className="timer-stack">
          <div className="status time" aria-label="Tiempo restante">
            {formatTime(state.timeRemainingSec)}
          </div>
          <span className="progress-label">{progress}% recorrido</span>
        </div>
      </header>

      {props.actionError && (
        <FlashBanner message={props.actionError} onDismiss={props.onDismissError} />
      )}

      <SceneHero
        image={state.sceneImageUrl}
        title={state.sceneTitle}
        mood={state.sceneMood}
      />

      <p className="scene prose">{state.sceneDescription}</p>

      <section className="panel glass">
        <h2>Diario de campo</h2>
        <ul className="log">
          {state.narrative.slice(-10).map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      </section>

      {(inventoryItems.length > 0 || sceneItemItems.length > 0) && (
        <section className="panel glass">
          <h2>Objetos</h2>
          <div className="item-grid">
            {inventoryItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                variant="inventory"
                busy={props.busy}
                onUse={
                  activePuzzle
                    ? () =>
                        props.onAction({
                          type: "use_item",
                          itemId: item.id,
                          puzzleId: activePuzzle.id,
                        })
                    : undefined
                }
              />
            ))}
            {sceneItemItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                variant="scene"
                busy={props.busy}
                onTake={() => props.onAction({ type: "take_item", itemId: item.id })}
              />
            ))}
          </div>
        </section>
      )}

      {state.puzzles.length > 0 && (
        <section className="panel glass panel-puzzle">
          <h2>Retos</h2>
          <div className="puzzle-tabs">
            {state.puzzles.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.id === props.activePuzzleId ? "tab active" : "tab"}
                disabled={p.solved}
                onClick={() => props.onSelectPuzzle(p.id)}
              >
                {p.solved ? "✓ " : ""}
                {p.label ?? p.id}
              </button>
            ))}
          </div>
          {activePuzzle && !activePuzzle.solved && (
            <>
              <p className="puzzle-prompt">{activePuzzle.prompt}</p>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!props.answer.trim()) return;
                  props.onAction({
                    type: "submit_answer",
                    puzzleId: activePuzzle.id,
                    value: props.answer,
                  });
                  props.onAnswerChange("");
                }}
              >
                <input
                  value={props.answer}
                  onChange={(e) => props.onAnswerChange(e.target.value)}
                  placeholder="Tu respuesta"
                  autoComplete="off"
                />
                <button type="submit" className="primary" disabled={props.busy}>
                  Enviar
                </button>
              </form>
              <button
                type="button"
                className="ghost"
                disabled={props.busy}
                onClick={() =>
                  props.onAction({
                    type: "request_hint",
                    puzzleId: activePuzzle.id,
                  })
                }
              >
                Pedir pista ({activePuzzle.hintsUsed}/{activePuzzle.maxHints})
              </button>
            </>
          )}
        </section>
      )}

      {state.exits.length > 0 && (
        <section className="panel glass">
          <h2>Salidas</h2>
          <ExitActions
            exits={state.exits}
            busy={props.busy}
            onMove={(sceneId: string) => props.onAction({ type: "move", sceneId })}
          />
        </section>
      )}

      {state.status !== "playing" && (
        <section className={`panel end ${state.status === "won" ? "end-won" : "end-lost"}`}>
          <h2 className="display-sm">
            {state.status === "won" ? "¡Escapaste!" : "Tiempo agotado"}
          </h2>
          <p>
            {state.status === "won"
              ? "La sala cede sus secretos. ¿Te atreves con otra?"
              : "La tormenta —o el edificio— ganó esta vez."}
          </p>
          <button type="button" className="primary wide" onClick={props.onNewGame}>
            Nueva partida
          </button>
        </section>
      )}
    </main>
  );
}

function ExitActions(props: {
  exits: PublicState["exits"];
  busy: boolean;
  onMove: (sceneId: string) => void;
}) {
  return (
    <div className="row wrap">
      {props.exits.map((exit) => (
        <button
          key={exit.toSceneId}
          type="button"
          className={exit.available ? "primary" : "ghost"}
          disabled={!exit.available || props.busy}
          onClick={() => props.onMove(exit.toSceneId)}
        >
          {exit.label}
          {!exit.available && <span className="meta-inline"> (bloqueada)</span>}
        </button>
      ))}
    </div>
  );
}
