/** Placeholder de carga al restaurar o iniciar sesión (misma silueta que `GameView`). */
export function GameSessionSkeleton() {
  return (
    <main
      className="shell game lobby-panel"
      aria-busy="true"
      aria-label="Cargando partida"
      data-testid="escape-session-loading"
    >
      <header className="game-head game-skeleton-head">
        <div className="game-skeleton-block">
          <div className="game-skeleton-line md" />
          <div className="game-skeleton-line lg" />
          <div className="game-skeleton-rail" aria-hidden />
        </div>
        <div className="game-skeleton-block align-end">
          <div className="game-skeleton-timer" aria-hidden />
          <div className="game-skeleton-line sm" />
        </div>
      </header>
      <div className="game-session-hero-skeleton" aria-hidden />
      <div className="game-skeleton-line prose" aria-hidden />
      <div className="game-skeleton-panel" aria-hidden />
    </main>
  );
}