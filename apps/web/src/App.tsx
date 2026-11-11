import type { OrchestratorResponse, PublicItem, PublicState } from "@escapeai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createSession, fetchRooms, fetchState, sendAction } from "./api";
import { ExperienceLobby } from "./ExperienceLobby";
import { InteractivePuzzle } from "./InteractivePuzzle";

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
    retry: (failureCount, error) =>
      failureCount < 2 && !String(error?.message ?? "").includes("Sesión no encontrada"),
    refetchInterval: (q) => (q.state.data?.status === "playing" ? 15_000 : false),
  });

  function clearSessionAndReturnHome() {
    localStorage.removeItem("escapeai.sessionId");
    localStorage.removeItem("escapeai.roomId");
    localStorage.removeItem("escapeai.eventCode");
    localStorage.removeItem("escapeai.teamId");
    setSessionId(null);
    setNarrator(null);
    setActionError(null);
    queryClient.removeQueries({ queryKey: ["state"] });
  }

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
      <ExperienceLobby
        rooms={roomsQuery.data ?? []}
        roomsLoading={roomsQuery.isLoading}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        classicBusy={startGame.isPending}
        classicError={
          startGame.isError || roomsQuery.isError
            ? "No se pudo conectar con la API o crear la partida."
            : null
        }
        onClassicStart={() => startGame.mutate(selectedRoomId)}
        onEventSession={(id, initialState) => {
          localStorage.setItem("escapeai.sessionId", id);
          setSessionId(id);
          setNarrator(null);
          setActionError(null);
          if (initialState) {
            queryClient.setQueryData(["state", id], initialState);
          }
        }}
      />
    );
  }

  if (stateQuery.isError) {
    return (
      <main className="shell lobby">
        <p className="error">
          Esta partida ya no está en el servidor (caducó o el navegador guardó un enlace viejo).
        </p>
        <button type="button" className="primary wide" onClick={clearSessionAndReturnHome}>
          Volver al inicio
        </button>
      </main>
    );
  }

  if (stateQuery.isLoading && !state) {
    return (
      <main className="shell">
        <p className="muted">Cargando sesión…</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="shell lobby">
        <p className="muted">Preparando partida…</p>
        <button type="button" className="ghost wide" onClick={clearSessionAndReturnHome}>
          Cancelar
        </button>
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
          <p className="eyebrow">
            {state.playerDisplayName ? `${state.playerDisplayName} · ` : ""}
            {state.roomName}
            {state.eventJoinCode ? ` · ${state.eventJoinCode}` : ""}
          </p>
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
            <InteractivePuzzle
              puzzle={activePuzzle}
              answer={props.answer}
              onAnswerChange={props.onAnswerChange}
              busy={props.busy}
              onAction={props.onAction}
            />
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
