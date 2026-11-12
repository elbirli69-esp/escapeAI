import type { EventLeaderboard, EventTeamPublic } from "@escapeai/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchEventLeaderboard } from "./api";

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

export function EventOrganizerBoard(props: { joinCode: string; onBack?: () => void }) {
  const q = useQuery({
    queryKey: ["leaderboard", props.joinCode],
    queryFn: () => fetchEventLeaderboard(props.joinCode),
    refetchInterval: 8_000,
  });

  const board = q.data as EventLeaderboard | undefined;
  const shareLine = `Código ${props.joinCode} — equipos entran en escapeAI con su nombre de grupo.`;

  return (
    <main className={`shell lobby organizer-board ${themeClass(board?.theme)}`}>
      {props.onBack && (
        <button type="button" className="ghost sm back-link" onClick={props.onBack}>
          ← Volver
        </button>
      )}
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
          <p className="join-code poster-code" aria-label={`Código del evento: ${props.joinCode}`}>
            {props.joinCode}
          </p>
          <p className="poster-hint">{shareLine}</p>
        </div>
      </div>
      {q.isError && <p className="error">No se pudo cargar el evento.</p>}
      {q.isLoading && <p className="muted">Actualizando equipos…</p>}
      <ol className="leaderboard-list leaderboard-projector">
        {(board?.teams ?? []).map((t, i) => (
          <li key={t.teamId} className={`leaderboard-row status-${t.status}`}>
            <span className="rank">{i + 1}</span>
            <div className="leaderboard-body">
              <strong>{t.teamName}</strong>
              <span className="meta">
                {statusLabel(t)}
                {t.puzzlesSolved !== undefined && t.status === "playing"
                  ? ` · ${t.puzzlesSolved} retos`
                  : ""}
                {t.status === "won" && t.elapsedSec !== undefined
                  ? ` · ${Math.floor(t.elapsedSec / 60)}:${(t.elapsedSec % 60).toString().padStart(2, "0")}`
                  : ""}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {!q.isLoading && (board?.teams.length ?? 0) === 0 && (
        <p className="muted">Aún no hay equipos registrados. Proyecta el código de arriba.</p>
      )}
    </main>
  );
}
