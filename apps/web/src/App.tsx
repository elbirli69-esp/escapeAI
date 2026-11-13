import type { NarrativeIntervention, PublicItem, PublicState } from "@escapeai/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  createSession,
  fetchAdventureTemplates,
  fetchLobbyHomeCards,
  fetchRooms,
  fetchState,
  sendAction,
} from "./api";
import { ExperienceLobby } from "./ExperienceLobby";
import { InteractivePuzzle } from "./InteractivePuzzle";
import { SceneHero } from "./SceneHero";
import { SpatialSitePlayMap } from "./SpatialSitePlayMap";
import { useGmSpeech } from "./hooks/useGmSpeech";
import { useRoomAmbience } from "./hooks/useRoomAmbience";
import {
  clearStoredSessionKeys,
  markSessionActiveForAutoResume,
  readStoredRoomId,
  readStoredSessionId,
  shouldAutoResumeSession,
} from "./lib/session-persistence";

function themeClass(theme?: string): string {
  return theme === "coastal" ? "theme-coastal" : "theme-urban";
}

function FlashBanner(props: {
  message: string;
  onDismiss?: () => void;
  testId?: string;
}) {
  return (
    <div
      className="flash-banner"
      role="alert"
      data-testid={props.testId ?? "escape-flash-error"}
    >
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

function endGameMessage(state: PublicState): { title: string; body: string } {
  const coastal = state.roomTheme === "coastal";
  if (state.status === "won") {
    return {
      title: "¡Escapaste!",
      body: coastal
        ? "El faro vuelve a encender su mensaje. La tormenta cede el paso."
        : "Las luces del edificio obedecen otra vez. El candado guarda tu victoria.",
    };
  }
  return {
    title: "Tiempo agotado",
    body: coastal
      ? "La marea se lleva la última chispa del faro. Mañana habrá otra señal."
      : "El conserje sigue dormido y el panel maestro en silencio. Reinténtalo.",
  };
}

function ItemCard(props: {
  item: PublicItem;
  variant: "inventory" | "scene";
  busy: boolean;
  onTake?: () => void;
  onUse?: () => void;
}) {
  const thumb = props.item.imageUrl;
  return (
    <article className="item-card">
      {thumb ? (
        <img className="item-thumb" src={thumb} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className="item-icon" aria-hidden>
          {props.variant === "inventory" ? "🎒" : "✦"}
        </div>
      )}
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
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const stored = readStoredSessionId();
    return stored && shouldAutoResumeSession() ? stored : null;
  });
  const [pendingResumeId, setPendingResumeId] = useState<string | null>(() => {
    const stored = readStoredSessionId();
    return stored && !shouldAutoResumeSession() ? stored : null;
  });
  const [pendingResumeRoomId] = useState<string | null>(() => readStoredRoomId());
  const [selectedRoomId, setSelectedRoomId] = useState("pilot");
  const [answer, setAnswer] = useState("");
  const [selectedPuzzle, setSelectedPuzzle] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  type SessionCache = { state: PublicState; gmInterventions: NarrativeIntervention[] };

  const roomsQuery = useQuery({
    queryKey: ["rooms", "pexels-covers"],
    queryFn: fetchRooms,
    enabled: !sessionId,
    staleTime: 15 * 60 * 1000,
    refetchOnMount: "always",
  });

  const homeCardsQuery = useQuery({
    queryKey: ["lobby", "home-cards", "pexels"],
    queryFn: fetchLobbyHomeCards,
    enabled: !sessionId,
    staleTime: 15 * 60 * 1000,
  });

  const adventuresQuery = useQuery({
    queryKey: ["adventures", "pexels-covers"],
    queryFn: fetchAdventureTemplates,
    enabled: !sessionId,
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (sessionId) markSessionActiveForAutoResume();
  }, [sessionId]);

  const startGame = useMutation({
    mutationFn: (roomId: string) => createSession(roomId),
    onSuccess: (data, roomId) => {
      localStorage.setItem("escapeai.sessionId", data.sessionId);
      localStorage.setItem("escapeai.roomId", roomId);
      setSessionId(data.sessionId);
      setActionError(null);
      queryClient.setQueryData<SessionCache>(["state", data.sessionId], {
        state: data.state,
        gmInterventions: data.gmInterventions ?? [],
      });
    },
  });

  const stateQuery = useQuery({
    queryKey: ["state", sessionId],
    queryFn: () => fetchState(sessionId!),
    enabled: Boolean(sessionId),
    retry: (failureCount, error) =>
      failureCount < 2 && !String(error?.message ?? "").includes("Sesión no encontrada"),
    refetchInterval: (q) =>
      (q.state.data as SessionCache | undefined)?.state?.status === "playing" ? 15_000 : false,
  });

  function clearSessionAndReturnHome() {
    clearStoredSessionKeys();
    setSessionId(null);
    setPendingResumeId(null);
    setActionError(null);
    queryClient.removeQueries({ queryKey: ["state"] });
  }

  function continuePendingSession() {
    if (!pendingResumeId) return;
    setSessionId(pendingResumeId);
    setPendingResumeId(null);
    markSessionActiveForAutoResume();
  }

  function abandonPendingSession() {
    clearStoredSessionKeys();
    setPendingResumeId(null);
    setActionError(null);
  }

  const actionMutation = useMutation({
    mutationFn: (action: Parameters<typeof sendAction>[1]) =>
      sendAction(sessionId!, action),
    onSuccess: (result) => {
      queryClient.setQueryData<SessionCache>(["state", sessionId], {
        state: result.state,
        gmInterventions: result.gmInterventions ?? [],
      });
      if (!result.ok && result.error) setActionError(result.error);
      else setActionError(null);
    },
    onError: () => setActionError("No se pudo contactar con el servidor. Reintenta."),
  });

  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 6000);
    return () => clearTimeout(t);
  }, [actionError]);

  const sessionView = stateQuery.data as SessionCache | undefined;
  const state = sessionView?.state;
  const gmInterventions = sessionView?.gmInterventions ?? [];

  const activePuzzleId = useMemo(() => {
    if (!state) return null;
    const open = state.puzzles.find((p) => !p.solved);
    return selectedPuzzle ?? open?.id ?? null;
  }, [state, selectedPuzzle]);

  if (!sessionId) {
    return (
      <ExperienceLobby
        homeCards={homeCardsQuery.data}
        homeCardsError={homeCardsQuery.isError}
        adventureTemplates={adventuresQuery.data}
        adventureTemplatesLoading={adventuresQuery.isPending && !adventuresQuery.data}
        rooms={roomsQuery.data ?? []}
        roomsLoading={roomsQuery.isPending && !roomsQuery.data}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        classicBusy={startGame.isPending}
        classicError={
          startGame.isError || roomsQuery.isError
            ? "No se pudo conectar con la API o crear la partida."
            : null
        }
        onClassicStart={() => startGame.mutate(selectedRoomId)}
        pendingResume={Boolean(pendingResumeId)}
        pendingResumeRoomId={pendingResumeRoomId}
        onContinuePendingSession={continuePendingSession}
        onAbandonPendingSession={abandonPendingSession}
        onEventSession={(id, initial) => {
          localStorage.setItem("escapeai.sessionId", id);
          setSessionId(id);
          setPendingResumeId(null);
          setActionError(null);
          if (initial) {
            queryClient.setQueryData<SessionCache>(["state", id], initial);
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
      gmInterventions={gmInterventions}
      onNewGame={() => {
        clearStoredSessionKeys();
        setSessionId(null);
        setPendingResumeId(null);
        setSelectedPuzzle(null);
        setActionError(null);
      }}
    />
  );
}

type DiaryLine = {
  key: string;
  text: string;
  kind: "engine" | "gamemaster";
  channel?: NarrativeIntervention["kind"];
};

function buildDiaryTimeline(
  engine: string[],
  gm: NarrativeIntervention[],
): DiaryLine[] {
  const engineLines: DiaryLine[] = engine.map((text, i) => ({
    key: `engine-${i}-${text.slice(0, 12)}`,
    text,
    kind: "engine",
  }));
  const gmLines: DiaryLine[] = [...gm]
    .sort((a, b) => a.sequence - b.sequence || a.createdAt - b.createdAt)
    .map((g) => ({
      key: g.id,
      text: g.text,
      kind: "gamemaster" as const,
      channel: g.kind,
    }));
  return [...engineLines, ...gmLines];
}

function CharacterChat(props: {
  characters: NonNullable<PublicState["sceneCharacters"]>;
  busy: boolean;
  onSend: (characterId: string, message: string) => void;
}) {
  const [characterId, setCharacterId] = useState(props.characters[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const active = props.characters.find((c) => c.id === characterId) ?? props.characters[0];

  useEffect(() => {
    if (!props.characters.some((c) => c.id === characterId)) {
      setCharacterId(props.characters[0]?.id ?? "");
    }
  }, [props.characters, characterId]);

  return (
    <section className="panel glass" data-testid="escape-character-chat">
      <h2>Hablar</h2>
      {props.characters.length > 1 && (
        <div className="puzzle-tabs" role="tablist" aria-label="Personajes">
          {props.characters.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === characterId ? "tab active" : "tab"}
              onClick={() => setCharacterId(c.id)}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      )}
      {active?.greeting && <p className="sm character-greeting">{active.greeting}</p>}
      <form
        className="character-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = message.trim();
          if (!trimmed || !characterId) return;
          props.onSend(characterId, trimmed);
          setMessage("");
        }}
      >
        <label className="sr-only" htmlFor="character-message">
          Mensaje para {active?.displayName}
        </label>
        <input
          id="character-message"
          type="text"
          className="character-input"
          data-testid="escape-character-input"
          placeholder={`Pregunta a ${active?.displayName ?? "…"}`}
          value={message}
          disabled={props.busy}
          maxLength={280}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="chip chip-action" disabled={props.busy || !message.trim()}>
          Enviar
        </button>
      </form>
    </section>
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
  gmInterventions: NarrativeIntervention[];
  onNewGame: () => void;
}) {
  const { state } = props;
  const diaryLines = useMemo(() => buildDiaryTimeline(state.narrative, props.gmInterventions), [
    state.narrative,
    props.gmInterventions,
  ]);
  const latestAi = [...props.gmInterventions]
    .reverse()
    .find((i) => i.meta.provider !== "static" && !i.meta.fallback);
  const [dismissedBannerId, setDismissedBannerId] = useState<string | null>(null);
  const gmBanner = useMemo(() => {
    return [...props.gmInterventions]
      .filter((i) => i.presentation === "banner")
      .sort((a, b) => b.sequence - a.sequence || b.createdAt - a.createdAt)[0];
  }, [props.gmInterventions]);
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

  const { ambienceOn, armFromGesture, toggleAmbience, reducedMotion } = useRoomAmbience(
    state.roomTheme,
    state.status === "playing",
  );
  const { gmTtsOn, toggleGmTts, armGmSpeech } = useGmSpeech(
    props.gmInterventions,
    state.sceneCharacters,
  );

  useEffect(() => {
    if (props.busy) {
      armFromGesture();
      armGmSpeech();
    }
  }, [props.busy, armFromGesture, armGmSpeech]);

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
            {latestAi && (
              <span className="narrator-badge" title={latestAi.text}>
                GameMaster
                {latestAi.meta.provider === "deepseek" ? " · DeepSeek" : ""}
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
          {!reducedMotion && (
            <>
              <button
                type="button"
                className="ghost sm ambience-toggle"
                aria-pressed={ambienceOn}
                onClick={() => {
                  armFromGesture();
                  toggleAmbience();
                }}
              >
                {ambienceOn ? "Ambiente · on" : "Ambiente · off"}
              </button>
              <button
                type="button"
                className="ghost sm gm-tts-toggle"
                data-testid="escape-gm-tts-toggle"
                aria-pressed={gmTtsOn}
                onClick={() => {
                  armGmSpeech();
                  toggleGmTts();
                }}
              >
                {gmTtsOn ? "Voz personajes · on" : "Voz personajes · off"}
              </button>
            </>
          )}
        </div>
      </header>

      {props.actionError && (
        <FlashBanner message={props.actionError} onDismiss={props.onDismissError} />
      )}

      {gmBanner && gmBanner.id !== dismissedBannerId && (
        <FlashBanner
          message={gmBanner.text}
          testId="escape-gm-banner"
          onDismiss={() => setDismissedBannerId(gmBanner.id)}
        />
      )}

      {state.spatialSiteMap && <SpatialSitePlayMap map={state.spatialSiteMap} />}

      {state.spatialRoomLabel && !state.spatialSiteMap?.currentSpatialSceneId && (
        <p className="site-spatial-banner sm" data-testid="escape-spatial-room-label">
          Estás en: <strong>{state.spatialRoomLabel}</strong>
        </p>
      )}

      <SceneHero
        image={state.sceneImageUrl}
        title={state.sceneTitle}
        mood={state.sceneMood}
      />

      <p className="scene prose">{state.sceneDescription}</p>

      {(state.sceneCharacters?.length ?? 0) > 0 && (
        <CharacterChat
          characters={state.sceneCharacters!}
          busy={props.busy}
          onSend={(characterId, message) =>
            props.onAction({ type: "talk_to_character", characterId, message })
          }
        />
      )}

      <section className="panel glass">
        <h2>Diario de campo</h2>
        <ul className="log" data-testid="escape-narrative-log">
          {diaryLines.slice(-14).map((line) => (
            <li
              key={line.key}
              className={line.kind === "gamemaster" ? "log-gm" : "log-engine"}
              data-testid={line.kind === "gamemaster" ? "escape-gm-line" : undefined}
            >
              {line.kind === "gamemaster" && (
                <span className="log-tag">
                  {line.channel === "character" ? "Personaje" : "Director"}
                </span>
              )}
              {line.text}
            </li>
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
                data-testid={`escape-puzzle-tab-${p.id}`}
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
        <section
          className={`panel end ${state.status === "won" ? "end-won" : "end-lost"}`}
          data-testid="escape-game-status"
          data-status={state.status}
        >
          {state.roomCoverImage && (
            <figure className="end-hero">
              <img src={state.roomCoverImage} alt="" className="end-hero-img" />
            </figure>
          )}
          <h2 className="display-sm">{endGameMessage(state).title}</h2>
          <p>{endGameMessage(state).body}</p>
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
          data-testid={`escape-exit-${exit.toSceneId}`}
          onClick={() => props.onMove(exit.toSceneId)}
        >
          {exit.label}
          {!exit.available && <span className="meta-inline"> (bloqueada)</span>}
        </button>
      ))}
    </div>
  );
}
