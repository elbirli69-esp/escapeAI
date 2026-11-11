import type { PublicState } from "@escapeai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { createSession, fetchState, sendAction } from "./api";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function App() {
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem("escapeai.sessionId"),
  );
  const [answer, setAnswer] = useState("");
  const [selectedPuzzle, setSelectedPuzzle] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const startGame = useMutation({
    mutationFn: () => createSession("pilot"),
    onSuccess: (data) => {
      localStorage.setItem("escapeai.sessionId", data.sessionId);
      setSessionId(data.sessionId);
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
        alert(result.error);
      }
    },
  });

  const state = stateQuery.data;

  const activePuzzleId = useMemo(() => {
    if (!state) return null;
    const open = state.puzzles.find((p) => !p.solved);
    return selectedPuzzle ?? open?.id ?? null;
  }, [state, selectedPuzzle]);

  if (!sessionId) {
    return (
      <main className="shell">
        <header>
          <p className="eyebrow">escapeAI</p>
          <h1>Escape room piloto</h1>
          <p className="lede">
            PWA con motor determinista en servidor. La capa de IA llegará después
            de los eventos de pista.
          </p>
        </header>
        <button
          type="button"
          className="primary"
          disabled={startGame.isPending}
          onClick={() => startGame.mutate()}
        >
          {startGame.isPending ? "Preparando sala…" : "Empezar partida"}
        </button>
      </main>
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
      onNewGame={() => {
        localStorage.removeItem("escapeai.sessionId");
        setSessionId(null);
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
  onNewGame: () => void;
}) {
  const { state } = props;
  const activePuzzle = state.puzzles.find((p) => p.id === props.activePuzzleId);

  return (
    <main className="shell">
      <header className="game-head">
        <div>
          <p className="eyebrow">{state.roomName}</p>
          <h1>{state.sceneTitle}</h1>
        </div>
        <div className="status time" aria-label="Tiempo restante">
          {formatTime(state.timeRemainingSec)}
        </div>
      </header>

      <p className="scene">{state.sceneDescription}</p>

      <section className="panel">
        <h2>Diario</h2>
        <ul className="log">
          {state.narrative.slice(-6).map((line, i) => (
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
