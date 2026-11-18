import type {
  AdventureTemplateInfo,
  AdventureType,
  EventPreview,
  JoinEventResponse,
  PublicState,
} from "@escapeai/shared";
import { useMutation } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { EventDurationMin } from "@escapeai/shared";
import {
  createCustomEvent,
  type LobbyHomeCard,
  joinEventAsTeam,
  startEventSession,
  type RoomSummary,
} from "./api";
import { EventJoinQr } from "./EventJoinQr";
import { EventOrganizerBoard } from "./EventOrganizerBoard";
import { AdventureTemplateCard } from "./AdventureTemplateCard";
import { LobbyHomeSkeleton } from "./LobbyHomeSkeleton";
import { LobbyShell } from "./LobbyShell";
import { formatRoomDuration, VisualCard } from "./VisualCard";
import { readJoinCodeFromLocation, stripJoinParamFromUrl } from "./lib/event-join-url";
import { isJoinCodeValid, normalizeJoinCodeInput } from "./lib/join-code";
import { homeModeAccentClass, type HomeModeId } from "./lib/home-mode-accent";
import { roomThemeLabel } from "./lib/room-theme-label";
import {
  clampTeamCount,
  parsePlayableFacts,
  validateCreateEventClient,
} from "./lib/validate-create-event";
const ScannerFlow = lazy(() =>
  import("./scanner/ScannerFlow").then((m) => ({ default: m.ScannerFlow })),
);

type LobbyMode = "home" | "create" | "join" | "organizer" | "catalog" | "scan";

const HOME_MODES: Array<{
  mode: HomeModeId;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}> = [
  {
    mode: "scan",
    title: "Escanear espacio",
    description: "Escanea la habitación y arma pistas sin subir fotos",
    image: "/media/pilot-basement.jpg",
    imageAlt: "Habitación con objetos para escanear",
  },
  {
    mode: "create",
    title: "Crear experiencia",
    description: "Diseña la fiesta y recibe un código para invitar",
    image: "/media/pilot-control.jpg",
    imageAlt: "Panel de control iluminado, ambiente de misterio urbano",
  },
  {
    mode: "join",
    title: "Entrar como equipo",
    description: "Introduce el código del organizador y el nombre de tu equipo",
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
    description: "Conserje, faro y salas de demostración",
    image: "/media/lighthouse-cover.jpg",
    imageAlt: "Faro en la costa, tormenta inminente",
  },
];

function themeClass(theme?: string): string {
  return theme === "coastal" ? "theme-coastal" : "theme-urban";
}

export function ExperienceLobby(props: {
  homeCards?: LobbyHomeCard[];
  homeCardsLoading?: boolean;
  homeCardsError?: boolean;
  adventureTemplates?: AdventureTemplateInfo[];
  adventureTemplatesLoading?: boolean;
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
  pendingResume?: boolean;
  pendingResumeRoomId?: string | null;
  onContinuePendingSession?: () => void;
  onAbandonPendingSession?: () => void;
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

  const homeImageByMode = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of props.homeCards ?? []) {
      map.set(card.mode, card.image);
    }
    return map;
  }, [props.homeCards]);

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

  const templates = props.adventureTemplates ?? [];
  const joinCodeValue = joinCode || created?.joinCode || "";
  const joinCodeReady = isJoinCodeValid(joinCodeValue);
  const teamNameReady = displayName.trim().length >= 2;
  const canSubmitJoin = joinCodeReady && teamNameReady;

  const createDraftError = useMemo(
    () =>
      validateCreateEventClient({
        adventureType,
        teamCount,
        durationMin,
        subjectName,
        facts,
      }),
    [adventureType, teamCount, durationMin, subjectName, facts],
  );
  const canSubmitCreate = createDraftError === undefined;
  const factLines = useMemo(() => parsePlayableFacts(facts), [facts]);

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
    const showHomeSkeleton =
      props.homeCardsLoading && !props.homeCardsError && (props.homeCards?.length ?? 0) === 0;
    return (
      <LobbyShell mode="home" testId="escape-lobby-home">
        <header className="lobby-hero">
          <p className="eyebrow">escapeAI</p>
          <h1 className="display">Tu escape, a tu medida</h1>
          <p className="lede">
            Organiza una aventura para 2–5 equipos (un móvil por equipo), comparte el código y
            proyecta el ranking.
          </p>
        </header>
        {props.pendingResume && (
          <section
            className="panel glass resume-banner"
            role="region"
            aria-label="Partida guardada"
            data-testid="escape-resume-banner"
          >
            <p className="resume-banner-text">
              Tienes una partida en curso
              {props.pendingResumeRoomId ? ` (${props.pendingResumeRoomId})` : ""}. ¿Qué quieres hacer?
            </p>
            <div className="row wrap resume-banner-actions">
              <button
                type="button"
                className="primary"
                data-testid="escape-resume-continue"
                onClick={props.onContinuePendingSession}
              >
                Continuar partida
              </button>
              <button
                type="button"
                className="ghost"
                data-testid="escape-resume-abandon"
                onClick={props.onAbandonPendingSession}
              >
                Empezar de nuevo
              </button>
            </div>
          </section>
        )}
        {showHomeSkeleton ? (
          <LobbyHomeSkeleton />
        ) : (
          <div className="mode-grid mode-grid-visual">
            {HOME_MODES.map((card) => (
              <VisualCard
                key={card.mode}
                title={card.title}
                description={card.description}
                imageSrc={props.homeCardsError ? card.image : homeImageByMode.get(card.mode)}
                imageAlt={card.imageAlt}
                imagePriority
                layout="stack"
                className={homeModeAccentClass(card.mode)}
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
        )}
      </LobbyShell>
    );
  }

  const selectedTemplate = templates.find((t) => t.id === adventureType);

  if (mode === "create") {
    return (
      <LobbyShell mode="create" className={themeClass(selectedTemplate?.theme)}>
        <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
          ← Volver
        </button>
        <header className="lobby-hero">
          <p className="eyebrow">Evento a medida</p>
          <h1 className="display">Configurar aventura</h1>
          <p className="lede muted">
            Elige el estilo de la fiesta; con nombre y anécdotas generamos pistas personalizadas.
          </p>
        </header>
        {formError && <p className="error">{formError}</p>}

        {!created ? (
          <form
            className="wizard wizard-wide wizard-create"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSubmitCreate) {
                setFormError(createDraftError ?? "Revisa el formulario.");
                return;
              }
              setFormError(null);
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
            <div className="wizard-create-body">
            <fieldset className="template-picker">
              <legend className="picker-legend">Tipo de aventura</legend>
              {props.adventureTemplatesLoading ? (
                <p className="muted">Cargando plantillas…</p>
              ) : (
                <ul className="room-grid room-grid-visual template-grid">
                  {templates.map((t) => (
                    <li key={t.id}>
                      <AdventureTemplateCard
                        template={t}
                        active={adventureType === t.id}
                        onSelect={() => setAdventureType(t.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
            {selectedTemplate && (
              <details className="template-detail-collapsible">
                <summary>{selectedTemplate.tagline ?? "Más sobre esta plantilla"}</summary>
                <p className="muted">{selectedTemplate.description}</p>
                <button type="button" className="ghost sm" onClick={() => applyTemplate(selectedTemplate)}>
                  Usar datos sugeridos
                </button>
              </details>
            )}

            <label>
              Equipos en competición (2–5)
              <input
                type="number"
                min={2}
                max={5}
                value={teamCount}
                onChange={(e) => setTeamCount(clampTeamCount(Number(e.target.value)))}
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
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Ej: Laura y Miguel"
                aria-invalid={subjectName.length > 0 && subjectName.trim().length < 2}
                required
              />
            </label>
            {subjectName.length > 0 && subjectName.trim().length < 2 && (
              <p className="field-hint error sm" role="alert">
                El nombre central necesita al menos 2 caracteres.
              </p>
            )}
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
              <textarea
                rows={4}
                value={facts}
                onChange={(e) => setFacts(e.target.value)}
                placeholder={"Ej: Nos conocimos en 2018\nFrase: «¡A por el récord!»"}
                aria-invalid={facts.length > 0 && factLines.length < 1}
                required
              />
            </label>
            {facts.length > 0 && factLines.length < 1 && (
              <p className="field-hint error sm" role="alert">
                Escribe al menos una línea con contenido (sin espacios vacíos).
              </p>
            )}
            <label>
              Título del evento (opcional)
              <input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Ej: Misterio de cumpleaños"
              />
            </label>
            </div>
            <div className="wizard-create-dock">
              <button
                type="submit"
                className="primary wide"
                data-testid="escape-event-create-submit"
                disabled={!canSubmitCreate || createMutation.isPending}
              >
                {createMutation.isPending ? "Generando sala…" : "Generar y obtener código"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div
              className={`event-poster join-card-poster poster-cartel ${themeClass(created.theme)}`}
            >
              {created.coverImage && (
                <img src={created.coverImage} alt="" className="event-poster-bg" loading="eager" />
              )}
              <div className="event-poster-scrim" aria-hidden />
              <div className="event-poster-body">
                <p className="eyebrow poster-eyebrow">
                  {selectedTemplate?.tagline ?? "Tu escape está listo"}
                </p>
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
      </LobbyShell>
    );
  }

  if (mode === "organizer") {
    const code = organizerBoardCode;
    return (
      <>
        {!code ? (
          <LobbyShell mode="organizer">
            <button type="button" className="ghost sm back-link" onClick={() => setMode("home")}>
              ← Volver
            </button>
            <header className="lobby-hero">
              <p className="eyebrow">Modo proyección</p>
              <h1 className="display">Panel organizador</h1>
              <p className="lede muted">Ranking en vivo para TV o proyector. Un código por evento.</p>
            </header>
            <form
              className="wizard"
              onSubmit={(e) => {
                e.preventDefault();
                const next = normalizeJoinCodeInput(organizerDraft);
                if (!isJoinCodeValid(next)) return;
                setOrganizerBoardCode(next);
              }}
            >
              <label>
                Código del evento
                <input
                  data-testid="escape-organizer-code-input"
                  value={organizerDraft}
                  onChange={(e) => setOrganizerDraft(normalizeJoinCodeInput(e.target.value))}
                  placeholder="Ej: X7K2M9"
                  maxLength={6}
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                />
              </label>
              <button
                type="submit"
                className="primary wide"
                data-testid="escape-organizer-open"
                disabled={!isJoinCodeValid(organizerDraft)}
              >
                Ver ranking
              </button>
            </form>
          </LobbyShell>
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
      <LobbyShell mode="join">
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
              value={joinCodeValue}
              onChange={(e) => setJoinCode(normalizeJoinCodeInput(e.target.value))}
              placeholder="Ej: X7K2M9"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={6}
              aria-invalid={joinCodeValue.length > 0 && !joinCodeReady}
              required
            />
          </label>
          {joinCodeValue.length > 0 && !joinCodeReady && (
            <p className="field-hint error sm" role="alert">
              El código tiene 6 caracteres (letras A–F y números).
            </p>
          )}
          <label>
            Nombre del equipo
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Los detectives"
              minLength={2}
              required
            />
          </label>
          {displayName.length > 0 && !teamNameReady && (
            <p className="field-hint error sm" role="alert">
              El nombre del equipo necesita al menos 2 caracteres.
            </p>
          )}
          <button
            type="submit"
            className="primary wide"
            disabled={!canSubmitJoin || joinMutation.isPending || startMutation.isPending}
          >
            {joinMutation.isPending || startMutation.isPending ? "Entrando…" : "Empezar partida del equipo"}
          </button>
        </form>
      </LobbyShell>
    );
  }

  const selectedRoom = props.rooms.find((r) => r.id === props.selectedRoomId);
  const catalogTheme = themeClass(selectedRoom?.theme);

  return (
    <LobbyShell mode="catalog" className={catalogTheme}>
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
      {props.roomsLoading ? (
        <ul className="room-grid room-grid-visual" aria-busy="true" aria-label="Cargando salas">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i}>
              <div className="lobby-card-skeleton lobby-card-skeleton-catalog" />
            </li>
          ))}
        </ul>
      ) : (
      <ul className="room-grid room-grid-visual">
        {props.rooms.map((room) => {
          const metaParts = [
            roomThemeLabel(room.theme),
            formatRoomDuration(room.timeLimitSec),
            room.sceneCount != null ? `${room.sceneCount} escenas` : null,
          ].filter(Boolean);
          return (
            <li key={room.id}>
              <VisualCard
                title={room.title}
                description={room.tagline ?? room.summary}
                imageSrc={room.coverImage}
                imageAlt={`Portada: ${room.title}`}
                meta={metaParts.join(" · ")}
                active={room.id === props.selectedRoomId}
                layout="stack"
                variant="compact"
                data-testid={`escape-room-${room.id}`}
                onClick={() => props.onSelectRoom(room.id)}
              />
            </li>
          );
        })}
      </ul>
      )}
      <button
        type="button"
        className="primary wide"
        data-testid="escape-start-classic"
        disabled={props.roomsLoading || props.classicBusy}
        onClick={props.onClassicStart}
      >
        {props.classicBusy ? "Preparando…" : "Empezar partida"}
      </button>
    </LobbyShell>
  );
}
