import type {
  AdventureTemplateInfo,
  AdventureType,
  EventPreview,
  JoinEventResponse,
  PublicState,
} from "@escapeai/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import type { EventDurationMin } from "@escapeai/shared";
import {
  createCustomEvent,
  fetchAdventureTemplates,
  joinEventAsTeam,
  startEventSession,
  type RoomSummary,
} from "./api";
import { EventJoinQr } from "./EventJoinQr";
import { EventOrganizerBoard } from "./EventOrganizerBoard";
import { formatRoomDuration, VisualCard } from "./VisualCard";
import { readJoinCodeFromLocation, stripJoinParamFromUrl } from "./lib/event-join-url";
const ScannerFlow = lazy(() =>
  import("./scanner/ScannerFlow").then((m) => ({ default: m.ScannerFlow })),
);

type LobbyMode = "home" | "create" | "join" | "organizer" | "catalog" | "scan";

const HOME_MODES: Array<{
  mode: LobbyMode;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}> = [
  {
    mode: "scan",
    title: "Escanear espacio",
    description: "ScannerAI: inventario local sin subir fotos",
    image: "/media/pilot-basement.jpg",
    imageAlt: "Habitación con objetos para escanear",
  },
  {
    mode: "create",
    title: "Crear experiencia",
    description: "Tipo, nombre central, datos → código para invitar",
    image: "/media/pilot-control.jpg",
    imageAlt: "Panel de control iluminado, ambiente de misterio urbano",
  },
  {
    mode: "join",
    title: "Entrar como equipo",
    description: "Código del organizador + nombre del equipo",
    image: "/media/pilot-entrance.jpg",
    imageAlt: "Entrada de edificio con luces de neón",
  },
  {
    mode: "organizer",
    title: "Panel organizador",
    description: "Ranking en vivo para TV o proyector",
    image: "/media/lighthouse-dock.jpg",
    imageAlt: "Muelle junto al mar, ambiente de competición",
  },
  {
    mode: "catalog",
    title: "Catálogo clásico",
    description: "Pilot, Faro y demás salas YAML",
    image: "/media/lighthouse-cover.jpg",
    imageAlt: "Faro en la costa, tormenta inminente",
  },
];

function themeClass(theme?: string): string {
  return theme === "coastal" ? "theme-coastal" : "theme-urban";
}

export function ExperienceLobby(props: {
  rooms: RoomSummary[];
  roomsLoading: boolean;
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  onClassicStart: () => void;
  classicBusy: boolean;
  classicError: string | null;
  onEventSession: (
    sessionId: string,
    initial?: { state: PublicState; gmInterventions: import("@escapeai/shared").NarrativeIntervention[] },
  ) => void;
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
  /** Código activo del panel organizador (solo tras enviar el formulario). */
  const [organizerBoardCode, setOrganizerBoardCode] = useState<string | null>(null);
  const [organizerDraft, setOrganizerDraft] = useState("");

  useEffect(() => {
    const code = readJoinCodeFromLocation();
    if (!code) return;
    setJoinCode(code);
    setMode("join");
    stripJoinParamFromUrl();
  }, []);

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
      props.onEventSession(data.sessionId, {
        state: data.state,
        gmInterventions: data.gmInterventions ?? [],
      });
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

  if (mode === "scan") {
    return (
      <Suspense fallback={<main className="shell lobby"><p className="muted">Cargando escáner…</p></main>}>
        <ScannerFlow onBack={() => setMode("home")} />
      </Suspense>
    );
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
        <div className="mode-grid mode-grid-visual">
          {HOME_MODES.map((card) => (
            <VisualCard
              key={card.mode}
              title={card.title}
              description={card.description}
              imageSrc={card.image}
              imageAlt={card.imageAlt}
              layout="stack"
              data-testid={
                card.mode === "catalog"
                  ? "escape-mode-catalog"
                  : card.mode === "create"
                    ? "escape-mode-create"
                    : card.mode === "scan"
                      ? "escape-mode-scan"
                      : card.mode === "join"
                      ? "escape-mode-join"
                      : card.mode === "organizer"
                        ? "escape-mode-organizer"
                        : undefined
              }
              onClick={() => {
                if (card.mode === "organizer") {
                  setOrganizerBoardCode(null);
                  setOrganizerDraft("");
                }
                setMode(card.mode);
              }}
            />
          ))}
        </div>
      </main>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === adventureType);

  if (mode === "create") {
    return (
      <main className={`shell lobby ${themeClass(selectedTemplate?.theme)}`}>
        <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
          ← Volver
        </button>
        <header className="lobby-hero">
          <p className="eyebrow">Evento a medida</p>
          <h1 className="display">Configurar aventura</h1>
          <p className="lede muted">Elige el tono visual; los datos del grupo se convierten en pistas.</p>
        </header>
        {formError && <p className="error">{formError}</p>}

        {!created ? (
          <form
            className="wizard wizard-wide"
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
            <fieldset className="template-picker">
              <legend className="picker-legend">Tipo de aventura</legend>
              {templatesQuery.isLoading && <p className="muted">Cargando plantillas…</p>}
              <ul className="room-grid room-grid-visual template-grid">
                {templates.map((t) => (
                  <li key={t.id}>
                    <VisualCard
                      title={t.title}
                      description={t.tagline ?? t.description}
                      imageSrc={t.coverImage}
                      imageAlt={`Plantilla: ${t.title}`}
                      active={adventureType === t.id}
                      layout="stack"
                      onClick={() => setAdventureType(t.id)}
                    />
                  </li>
                ))}
              </ul>
            </fieldset>
            {selectedTemplate && (
              <p className="template-detail muted">
                {selectedTemplate.description}{" "}
                <button type="button" className="ghost sm" onClick={() => applyTemplate(selectedTemplate)}>
                  Usar datos sugeridos
                </button>
              </p>
            )}

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
          <>
            <div className={`event-poster join-card-poster ${themeClass(created.theme)}`}>
              {created.coverImage && (
                <img src={created.coverImage} alt="" className="event-poster-bg" loading="eager" />
              )}
              <div className="event-poster-scrim" aria-hidden />
              <div className="event-poster-body">
                <p className="eyebrow">Código para compartir</p>
                <div className="event-poster-invite">
                  <div className="event-poster-invite-copy">
                    <p className="join-code poster-code" data-testid="escape-join-code-display">
                      {created.joinCode}
                    </p>
                    <p>
                      <strong>{created.title}</strong> · {created.sceneCount} escenas ·{" "}
                      {Math.round(created.timeLimitSec / 60)} min · {created.teamCount} equipos
                    </p>
                    <p className="muted">Escanea el QR o escribe el código. Un móvil por equipo.</p>
                  </div>
                  <EventJoinQr joinCode={created.joinCode} size="md" />
                </div>
              </div>
            </div>
            <div className="join-card-actions">
              <button
                type="button"
                className="primary wide"
                onClick={() => {
                  setJoinCode(created.joinCode);
                  setOrganizerBoardCode(created.joinCode);
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
          </>
        )}
      </main>
    );
  }

  if (mode === "organizer") {
    const code = organizerBoardCode;
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
                const next = organizerDraft.trim().toUpperCase();
                if (!next) return;
                setOrganizerBoardCode(next);
              }}
            >
              <label>
                Código del evento
                <input
                  data-testid="escape-organizer-code-input"
                  value={organizerDraft}
                  onChange={(e) => setOrganizerDraft(e.target.value.toUpperCase())}
                  required
                />
              </label>
              <button type="submit" className="primary wide" data-testid="escape-organizer-open">
                Ver ranking
              </button>
            </form>
          </main>
        ) : (
          <EventOrganizerBoard
            joinCode={code}
            onBack={() => {
              setOrganizerBoardCode(null);
              setOrganizerDraft("");
              setMode("home");
            }}
          />
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

  const selectedRoom = props.rooms.find((r) => r.id === props.selectedRoomId);
  const catalogTheme = themeClass(selectedRoom?.theme);

  return (
    <main className={`shell lobby ${catalogTheme}`}>
      <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
        ← Volver
      </button>
      <header className="lobby-hero">
        <p className="eyebrow">Salas listas para jugar</p>
        <h1 className="display">Elige tu escape</h1>
        <p className="lede muted">
          Cada carta muestra la atmósfera de la sala. Un móvil por jugador o por equipo.
        </p>
      </header>
      {props.classicError && <p className="error">{props.classicError}</p>}
      {props.roomsLoading && <p className="muted">Cargando salas…</p>}
      <ul className="room-grid room-grid-visual">
        {props.rooms.map((room) => {
          const themeLabel =
            room.theme === "coastal" ? "Costa · faro" : room.theme === "urban" ? "Urbano · noche" : "Aventura";
          const metaParts = [
            formatRoomDuration(room.timeLimitSec),
            room.sceneCount != null ? `${room.sceneCount} escenas` : null,
            themeLabel,
          ].filter(Boolean);
          return (
            <li key={room.id}>
              <VisualCard
                title={room.title}
                description={room.tagline ?? room.summary}
                imageSrc={room.coverImage}
                imageAlt={`Portada: ${room.title}`}
                meta={metaParts.join(" · ")}
                eyebrow={room.summary !== (room.tagline ?? "") ? room.summary : undefined}
                active={room.id === props.selectedRoomId}
                layout="stack"
                data-testid={`escape-room-${room.id}`}
                onClick={() => props.onSelectRoom(room.id)}
              />
            </li>
          );
        })}
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
