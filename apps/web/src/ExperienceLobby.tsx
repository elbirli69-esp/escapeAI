import type {
  AdventureTemplateInfo,
  AdventureType,
  EventPreview,
  JoinEventResponse,
} from "@escapeai/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  createCustomEvent,
  fetchAdventureTemplates,
  joinEventAsPlayer,
  startEventSession,
  type RoomSummary,
} from "./api";

type LobbyMode = "home" | "create" | "join" | "catalog";

export function ExperienceLobby(props: {
  rooms: RoomSummary[];
  roomsLoading: boolean;
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  onClassicStart: () => void;
  classicBusy: boolean;
  classicError: string | null;
  onEventSession: (sessionId: string) => void;
}) {
  const [mode, setMode] = useState<LobbyMode>("home");
  const [adventureType, setAdventureType] = useState<AdventureType>("birthday");
  const [playerCount, setPlayerCount] = useState(8);
  const [subjectName, setSubjectName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [facts, setFacts] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [created, setCreated] = useState<EventPreview | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["adventures"],
    queryFn: fetchAdventureTemplates,
    enabled: mode === "create",
  });

  const createMutation = useMutation({
    mutationFn: createCustomEvent,
    onSuccess: (preview) => {
      setCreated(preview);
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: async (): Promise<JoinEventResponse> => joinEventAsPlayer(joinCode, displayName),
    onError: (e: Error) => setFormError(e.message),
  });

  const startMutation = useMutation({
    mutationFn: async (payload: JoinEventResponse) => startEventSession(payload.joinCode, payload.playerId),
    onSuccess: (data) => {
      localStorage.setItem("escapeai.sessionId", data.sessionId);
      localStorage.setItem("escapeai.eventCode", joinCode || created?.joinCode || "");
      localStorage.setItem("escapeai.playerId", joinMutation.data?.playerId ?? "");
      props.onEventSession(data.sessionId);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const templates = templatesQuery.data ?? [];

  function applyTemplate(t: AdventureTemplateInfo) {
    setAdventureType(t.id);
    if (!facts.trim()) {
      setFacts(t.suggestedFacts.join("\n"));
    }
  }

  if (mode === "home") {
    return (
      <main className="shell lobby">
        <header className="lobby-hero">
          <p className="eyebrow">escapeAI</p>
          <h1 className="display">Tu escape, a tu medida</h1>
          <p className="lede">
            Crea una experiencia para hasta 20 jugadores (cada móvil, sus pistas) o entra al
            catálogo clásico.
          </p>
        </header>
        <div className="mode-grid">
          <button type="button" className="room-card-v2" onClick={() => setMode("create")}>
            <strong>Crear experiencia</strong>
            <span className="meta">Tipo, protagonista, datos → código para invitar</span>
          </button>
          <button type="button" className="room-card-v2" onClick={() => setMode("join")}>
            <strong>Unirme con código</strong>
            <span className="meta">Hasta 20 jugadores en paralelo</span>
          </button>
          <button type="button" className="room-card-v2" onClick={() => setMode("catalog")}>
            <strong>Catálogo clásico</strong>
            <span className="meta">Pilot, Faro y demás salas YAML</span>
          </button>
        </div>
      </main>
    );
  }

  if (mode === "create") {
    return (
      <main className="shell lobby">
        <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
          ← Volver
        </button>
        <h1 className="display">Configurar aventura</h1>
        {formError && <p className="error">{formError}</p>}

        {!created ? (
          <form
            className="wizard"
            onSubmit={(e) => {
              e.preventDefault();
              const factLines = facts
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);
              createMutation.mutate({
                adventureType,
                playerCount,
                subject: {
                  name: subjectName.trim(),
                  nickname: nickname.trim() || undefined,
                  age: age ? Number(age) : undefined,
                },
                facts: factLines,
                eventTitle: eventTitle.trim() || undefined,
              });
            }}
          >
            <label>
              Tipo de aventura
              <select
                value={adventureType}
                onChange={(e) => setAdventureType(e.target.value as AdventureType)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            {templates
              .filter((t) => t.id === adventureType)
              .map((t) => (
                <p key={t.id} className="muted">
                  {t.description}{" "}
                  <button type="button" className="ghost sm" onClick={() => applyTemplate(t)}>
                    Usar datos sugeridos
                  </button>
                </p>
              ))}

            <label>
              Jugadores (máx. 20)
              <input
                type="number"
                min={1}
                max={20}
                value={playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
              />
            </label>
            <label>
              Protagonista (nombre completo)
              <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
            </label>
            <label>
              Apodo (opcional)
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </label>
            <label>
              Edad (opcional, para código numérico)
              <input type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label>
              Datos jugables (uno por línea)
              <textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} required />
            </label>
            <label>
              Título del evento (opcional)
              <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            </label>
            <button type="submit" className="primary wide" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Generando sala…" : "Generar y obtener código"}
            </button>
          </form>
        ) : (
          <div className="join-card">
            <p className="eyebrow">Código para compartir</p>
            <p className="join-code">{created.joinCode}</p>
            <p>
              <strong>{created.title}</strong> · {created.sceneCount} escenas ·{" "}
              {Math.round(created.timeLimitSec / 60)} min · cupo {created.playerCount}
            </p>
            <p className="muted">
              Cada persona se une con el código y su nombre; al jugar, el narrador usará ese nombre en
              las pistas.
            </p>
            <button
              type="button"
              className="primary wide"
              onClick={() => {
                setJoinCode(created.joinCode);
                setMode("join");
              }}
            >
              Probar como jugador
            </button>
          </div>
        )}
      </main>
    );
  }

  if (mode === "join") {
    return (
      <main className="shell lobby">
        <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
          ← Volver
        </button>
        <h1 className="display">Unirse</h1>
        {formError && <p className="error">{formError}</p>}
        <form
          className="wizard"
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            joinMutation.mutate(undefined, {
              onSuccess: (joined) => startMutation.mutate(joined),
            });
          }}
        >
          <label>
            Código del evento
            <input
              value={joinCode || created?.joinCode || ""}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              required
            />
          </label>
          <label>
            Tu nombre en la partida
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <button
            type="submit"
            className="primary wide"
            disabled={joinMutation.isPending || startMutation.isPending}
          >
            {joinMutation.isPending || startMutation.isPending ? "Entrando…" : "Empezar mi partida"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={`shell lobby ${props.selectedRoomId ? "theme-urban" : ""}`}>
      <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
        ← Volver
      </button>
      <header className="lobby-hero">
        <h1 className="display">Catálogo</h1>
      </header>
      {props.classicError && <p className="error">{props.classicError}</p>}
      {props.roomsLoading && <p className="muted">Cargando salas…</p>}
      <ul className="room-grid">
        {props.rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              className={room.id === props.selectedRoomId ? "room-card-v2 active" : "room-card-v2"}
              onClick={() => props.onSelectRoom(room.id)}
            >
              <div className="room-card-copy">
                <strong>{room.title}</strong>
                {room.tagline && <span className="room-tagline">{room.tagline}</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="primary wide"
        disabled={props.classicBusy}
        onClick={props.onClassicStart}
      >
        {props.classicBusy ? "Preparando…" : "Empezar partida"}
      </button>
    </main>
  );
}
