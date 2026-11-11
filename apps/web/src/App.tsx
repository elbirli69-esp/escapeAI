import type { OrchestratorResponse, PublicState } from "@escapeai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { createSession, fetchRooms, fetchState, sendAction, type RoomSummary } from "./api";

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
  return (
    <main className="shell">
      <header>
        <p className="eyebrow">escapeAI</p>
        <h1>Elige una sala</h1>
        <p className="lede">
          Motor en servidor, narración opcional con IA. Instala la PWA para jugar a
          pantalla completa.
        </p>
      </header>
      {props.startError && <FlashBanner message={props.startError} onDismiss={undefined} />}
      {props.loading && <p>Cargando salas…</p>}
      {props.error && (
        <p className="error">No se pudo cargar el catálogo. ¿Está la API en marcha?</p>
      )}
      <ul className="room-list">
        {props.rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              className={
                room.id === props.selectedRoomId ? "room-card active" : "room-card"
              }
              onClick={() => props.onSelectRoom(room.id)}
            >
              <strong>{room.title}</strong>
              <span>{room.summary}</span>
              <span className="meta">{Math.round(room.timeLimitSec / 60)} min</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="primary"
        disabled={props.busy || props.rooms.length === 0}
        onClick={props.onStart}
      >
        {props.busy ? "Preparando sala…" : "Empezar partida"}
      </button>
    </main>
  );
}

function FlashBanner(props: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flash-banner" role="alert">
      <span>{props.message}</span>
      {props.onDismiss && (
        <button type="button" className="flash-dismiss" onClick={props.onDismiss} aria-label="Cerrar">
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
    refetchInterval: (q) =>
      q.state.data?.status === "playing" ? 15_000 : false,
  });

  const actionMutation = useMutation({
    mutationFn: (action: Parameters<typeof sendAction>[1]) =>
      sendAction(sessionId!, action),
    onSuccess: (result) => {
      queryClient.setQueryData(["state", sessionId], result.state);
      if (!result.ok && result.error) {
        setActionError(result.error);
      } else {
        setActionError(null);
      }
      if (result.orchestrator) {
        setNarrator(result.orchestrator);
      }
    },
    onError: () => {
      setActionError("No se pudo contactar con el servidor. Reintenta.");
    },
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
        <p>Cargando sesión…</p>
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
  const activePuzzle = state.puzzles.find((p) => p.id === props.activePuzzleId);

  return (
    <main className="shell">
      <header className="game-head">
        <div>
          <p className="eyebrow">{state.roomName}</p>
          <div className="title-row">
            <h1>{state.sceneTitle}</h1>
            {props.narrator?.source === "openai" && (
              <span className="narrator-badge" title={props.narrator.message}>
                Narrador IA
              </span>
            )}
          </div>
        </div>
        <div className="status time" aria-label="Tiempo restante">
          {formatTime(state.timeRemainingSec)}
        </div>
      </header>

      {props.actionError && (
        <FlashBanner message={props.actionError} onDismiss={props.onDismissError} />
      )}

      <p className="scene">{state.sceneDescription}</p>

      <section className="panel">
        <h2>Diario</h2>
        <ul className="log">
          {state.narrative.slice(-8).map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
          ))}
        </ul>
      </section>

      {(state.inventory.length > 0 || state.sceneItems.length > 0) && (
        <section className="panel">
          <h2>Objetos</h2>
          <div className="chips">
            {state.inventory.map((id) => (
              <span key={id} className="chip">
                {id}
              </span>
            ))}
            {state.sceneItems.map((id) => (
              <button
                key={id}
                type="button"
                className="chip chip-action"
                disabled={props.busy}
                onClick={() => props.onAction({ type: "take_item", itemId: id })}
              >
                Coger {id}
              </button>
            ))}
          </div>
        </section>
      )}

      {state.puzzles.length > 0 && (
        <section className="panel">
          <h2>Puzzles</h2>
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
                {p.id}
              </button>
            ))}
          </div>
          {activePuzzle && !activePuzzle.solved && (
            <>
              <p>{activePuzzle.prompt}</p>
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
                  placeholder="Respuesta"
                  autoComplete="off"
                />
                <button type="submit" className="primary" disabled={props.busy}>
                  Enviar
                </button>
              </form>
              {state.inventory.length > 0 && (
                <InventoryActions
                  inventory={state.inventory}
                  busy={props.busy}
                  onUse={(itemId: string) =>
                    props.onAction({
                      type: "use_item",
                      itemId,
                      puzzleId: activePuzzle.id,
                    })
                  }
                />
              )}
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
        <section className="panel">
          <h2>Salidas</h2>
          <ExitActions
            exits={state.exits}
            busy={props.busy}
            onMove={(sceneId: string) => props.onAction({ type: "move", sceneId })}
          />
        </section>
      )}

      {state.status !== "playing" && (
        <section className="panel end">
          <h2>{state.status === "won" ? "Victoria" : "Fin"}</h2>
          <button type="button" className="primary" onClick={props.onNewGame}>
            Nueva partida
          </button>
        </section>
      )}
    </main>
  );
}

function InventoryActions(props: {
  inventory: string[];
  busy: boolean;
  onUse: (itemId: string) => void;
}) {
  return (
    <div className="row wrap">
      {props.inventory.map((itemId) => (
        <button
          key={itemId}
          type="button"
          className="ghost"
          disabled={props.busy}
          onClick={() => props.onUse(itemId)}
        >
          Usar {itemId}
        </button>
      ))}
    </div>
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
        </button>
      ))}
    </div>
  );
}
