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

export function EventOrganizerBoard(props: { joinCode: string; onBack?: () => void }) {
  const q = useQuery({
    queryKey: ["leaderboard", props.joinCode],
    queryFn: () => fetchEventLeaderboard(props.joinCode),
    refetchInterval: 8_000,
  });

  const board = q.data as EventLeaderboard | undefined;

  return (
    <main className="shell lobby organizer-board">
      {props.onBack && (
        <button type="button" className="ghost sm back-link" onClick={props.onBack}>
          ← Volver
        </button>
      )}
      <header className="lobby-hero">
        <p className="eyebrow">Panel del organizador</p>
        <h1 className="display-sm">{board?.title ?? "Cargando…"}</h1>
        <p className="lede">
          Código <strong className="join-code inline">{props.joinCode}</strong> — proyecta esta pantalla
          para el ranking en vivo.
        </p>
      </header>
      {q.isError && <p className="error">No se pudo cargar el evento.</p>}
      {q.isLoading && <p className="muted">Actualizando equipos…</p>}
      <ol className="leaderboard-list">
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
        <p className="muted">Aún no hay equipos registrados. Comparte el código.</p>
      )}
    </main>
  );
}
