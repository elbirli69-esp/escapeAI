import type {
  AdventureTemplateInfo,
  AdventureType,
  EventPreview,
  JoinEventResponse,
  PublicState,
} from "@escapeai/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { EventDurationMin } from "@escapeai/shared";
import {
  createCustomEvent,
  fetchAdventureTemplates,
  joinEventAsTeam,
  startEventSession,
  type RoomSummary,
} from "./api";
import { EventOrganizerBoard } from "./EventOrganizerBoard";

type LobbyMode = "home" | "create" | "join" | "organizer" | "catalog";

export function ExperienceLobby(props: {
  rooms: RoomSummary[];
  roomsLoading: boolean;
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  onClassicStart: () => void;
  classicBusy: boolean;
  classicError: string | null;
  onEventSession: (sessionId: string, initialState?: PublicState) => void;
}) {
  const [mode, setMode] = useState<LobbyMode>("home");
  const [adventureType, setAdventureType] = useState<AdventureType>("celebration");
  const [teamCount, setTeamCount] = useState(4);
  const [durationMin, setDurationMin] = useState<EventDurationMin>(45);
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
    mutationFn: async (): Promise<JoinEventResponse> => joinEventAsTeam(joinCode, displayName),
    onError: (e: Error) => setFormError(e.message),
  });

  const startMutation = useMutation({
    mutationFn: async (payload: JoinEventResponse) =>
      startEventSession(payload.joinCode, payload.teamId ?? payload.playerId),
    onSuccess: (data) => {
      localStorage.setItem("escapeai.sessionId", data.sessionId);
      localStorage.setItem("escapeai.eventCode", joinCode || created?.joinCode || "");
      localStorage.setItem(
        "escapeai.teamId",
        joinMutation.data?.teamId ?? joinMutation.data?.playerId ?? "",
      );
      props.onEventSession(data.sessionId, data.state);
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
      <main className="shell lobby" data-testid="escape-lobby-home">
        <header className="lobby-hero">
          <p className="eyebrow">escapeAI</p>
          <h1 className="display">Tu escape, a tu medida</h1>
          <p className="lede">
            Organiza una aventura para 2–5 equipos (un móvil por equipo), comparte el código y
            proyecta el ranking.
          </p>
        </header>
        <div className="mode-grid">
          <button type="button" className="room-card-v2" onClick={() => setMode("create")}>
            <strong>Crear experiencia</strong>
            <span className="meta">Tipo, nombre central, datos → código para invitar</span>
          </button>
          <button type="button" className="room-card-v2" onClick={() => setMode("join")}>
            <strong>Entrar como equipo</strong>
            <span className="meta">Código del organizador + nombre del equipo</span>
          </button>
          <button type="button" className="room-card-v2" onClick={() => setMode("organizer")}>
            <strong>Panel organizador</strong>
            <span className="meta">Ranking en vivo para TV o proyector</span>
          </button>
          <button
            type="button"
            className="room-card-v2"
            data-testid="escape-mode-catalog"
            onClick={() => setMode("catalog")}
          >
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
                teamCount,
                durationMin,
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
              Equipos en competición (2–5)
              <input
                type="number"
                min={2}
                max={5}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
              />
            </label>
            <label>
              Duración (minutos)
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value) as EventDurationMin)}
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </label>
            <label>
              Nombre central (persona, pareja o nombre del evento)
              <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
            </label>
            <label>
              Apodo o forma corta (opcional)
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </label>
            <label>
              Cifra clave (opcional: año, aniversario, número interno…)
              <input type="number" min={1} max={9999} value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
            <label>
              Datos jugables (fechas, lugares, frases — uno por línea)
              <textarea rows={4} value={facts} onChange={(e) => setFacts(e.target.value)} required />
            </label>
            <label>
              Título del evento (opcional)
              <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            </label>
            <button
              type="submit"
              className="primary wide"
              data-testid="escape-event-create-submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Generando sala…" : "Generar y obtener código"}
            </button>
          </form>
        ) : (
          <div className="join-card">
            <p className="eyebrow">Código para compartir</p>
            <p className="join-code" data-testid="escape-join-code-display">
              {created.joinCode}
            </p>
            <p>
              <strong>{created.title}</strong> · {created.sceneCount} escenas ·{" "}
              {Math.round(created.timeLimitSec / 60)} min · {created.teamCount} equipos
            </p>
            <p className="muted">
              Cada equipo entra con el código y su nombre de grupo. Recomendado: un móvil por equipo.
            </p>
            <button
              type="button"
              className="primary wide"
              onClick={() => {
                setJoinCode(created.joinCode);
                setMode("organizer");
              }}
            >
              Abrir panel / proyector
            </button>
            <button
              type="button"
              className="ghost wide"
              onClick={() => {
                setJoinCode(created.joinCode);
                setMode("join");
              }}
            >
              Probar como equipo
            </button>
          </div>
        )}
      </main>
    );
  }

  if (mode === "organizer") {
    const code = created?.joinCode || joinCode;
    return (
      <>
        {!code ? (
          <main className="shell lobby">
            <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
              ← Volver
            </button>
            <h1 className="display">Panel organizador</h1>
            <form
              className="wizard"
              onSubmit={(e) => {
                e.preventDefault();
                setJoinCode(joinCode.toUpperCase());
              }}
            >
              <label>
                Código del evento
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                />
              </label>
              <button type="submit" className="primary wide">
                Ver ranking
              </button>
            </form>
          </main>
        ) : (
          <EventOrganizerBoard joinCode={code} onBack={() => setMode("home")} />
        )}
      </>
    );
  }

  if (mode === "join") {
    return (
      <main className="shell lobby">
        <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
          ← Volver
        </button>
        <h1 className="display">Unirse como equipo</h1>
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
              data-testid="escape-join-code-input"
              value={joinCode || created?.joinCode || ""}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCDEF"
              required
            />
          </label>
          <label>
            Nombre del equipo
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <button
            type="submit"
            className="primary wide"
            disabled={joinMutation.isPending || startMutation.isPending}
          >
            {joinMutation.isPending || startMutation.isPending ? "Entrando…" : "Empezar partida del equipo"}
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
              data-testid={`escape-room-${room.id}`}
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
        data-testid="escape-start-classic"
        disabled={props.classicBusy}
        onClick={props.onClassicStart}
      >
        {props.classicBusy ? "Preparando…" : "Empezar partida"}
      </button>
    </main>
  );
}
