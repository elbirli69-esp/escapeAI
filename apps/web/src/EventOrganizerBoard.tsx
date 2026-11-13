import type { EventLeaderboard, EventTeamPublic } from "@escapeai/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { EventJoinQr } from "./EventJoinQr";
import { fetchEventLeaderboard } from "./api";
import { teamAvatarStyle } from "./team-avatar";

function statusLabel(t: EventTeamPublic): string {
  switch (t.status) {
    case "won":
      return "¡Escapados!";
    case "lost":
      return "Tiempo agotado";
    case "playing":
      return "En juego";
    default:
      return "Esperando";
  }
}

function themeClass(theme?: string): string {
  return theme === "coastal" ? "theme-coastal" : "theme-urban";
}

function readProjectorFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("projector") === "1";
}

export function EventOrganizerBoard(props: { joinCode: string; onBack?: () => void }) {
  const [projectorTv, setProjectorTv] = useState(readProjectorFromUrl);

  const syncProjectorUrl = useCallback((on: boolean) => {
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("projector", "1");
    else url.searchParams.delete("projector");
    window.history.replaceState({}, "", url);
  }, []);

  useEffect(() => {
    syncProjectorUrl(projectorTv);
  }, [projectorTv, syncProjectorUrl]);

  const q = useQuery({
    queryKey: ["leaderboard", props.joinCode],
    queryFn: () => fetchEventLeaderboard(props.joinCode),
    refetchInterval: 8_000,
  });

  const board = q.data as EventLeaderboard | undefined;
  const shareLine = `QR o código ${props.joinCode} — cada equipo elige su nombre al entrar.`;

  return (
    <main
      className={`shell lobby organizer-board ${themeClass(board?.theme)} ${projectorTv ? "organizer-tv" : ""}`}
      data-testid="escape-organizer-board"
    >
      {props.onBack && (
        <button type="button" className="ghost sm back-link" onClick={props.onBack}>
          ← Volver
        </button>
      )}
      <div className="organizer-toolbar">
        <button
          type="button"
          className={projectorTv ? "primary sm" : "ghost sm"}
          onClick={() => setProjectorTv((v) => !v)}
          aria-pressed={projectorTv}
        >
          {projectorTv ? "Modo TV activo" : "Activar modo TV"}
        </button>
        {projectorTv && (
          <span className="meta">Tipografía ampliada · comparte la URL con ?projector=1</span>
        )}
      </div>
      <div className="event-poster organizer-poster">
        {board?.coverImage && (
          <img
            src={board.coverImage}
            alt=""
            className="event-poster-bg"
            loading="eager"
            decoding="async"
          />
        )}
        <div className="event-poster-scrim" aria-hidden />
        <div className="event-poster-body">
          <p className="eyebrow">Invitación al escape</p>
          <h1 className="display-sm">{board?.title ?? "Cargando evento…"}</h1>
          <div className="event-poster-invite">
            <div className="event-poster-invite-copy">
              <p className="join-code poster-code" aria-label={`Código del evento: ${props.joinCode}`}>
                {props.joinCode}
              </p>
              <p className="poster-hint">{shareLine}</p>
            </div>
            <EventJoinQr joinCode={props.joinCode} size={projectorTv ? "lg" : "md"} />
          </div>
        </div>
      </div>
      {board?.progressSummary && (
        <p className="organizer-milestone" data-testid="escape-organizer-milestone">
          {board.progressSummary}
        </p>
      )}
      {q.isError && <p className="error">No se pudo cargar el evento.</p>}
      {q.isLoading && <p className="muted">Actualizando equipos…</p>}
      <ol className="leaderboard-list leaderboard-projector" data-testid="escape-leaderboard-list">
        {(board?.teams ?? []).map((t, i) => {
          const avatar = teamAvatarStyle(t.teamName);
          return (
            <li key={t.teamId} className={`leaderboard-row status-${t.status}`}>
              <span className="rank">{i + 1}</span>
              <span
                className="team-avatar"
                style={{ background: avatar.background }}
                aria-hidden
              >
                {avatar.initials}
              </span>
              <div className="leaderboard-body">
                <strong>{t.teamName}</strong>
                <span className="meta">
                  {statusLabel(t)}
                  {t.puzzlesSolved !== undefined && t.status === "playing"
                    ? ` · ${t.puzzlesSolved} retos`
                    : ""}
                  {t.status === "playing" && t.currentSceneTitle
                    ? ` · ${t.currentSceneTitle}`
                    : ""}
                  {t.status === "won" && t.elapsedSec !== undefined
                    ? ` · ${Math.floor(t.elapsedSec / 60)}:${(t.elapsedSec % 60).toString().padStart(2, "0")}`
                    : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {!q.isLoading && (board?.teams.length ?? 0) === 0 && (
        <p className="muted">Aún no hay equipos registrados. Proyecta el código de arriba.</p>
      )}
    </main>
  );
}
