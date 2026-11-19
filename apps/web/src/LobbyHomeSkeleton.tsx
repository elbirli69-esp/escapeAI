/** Placeholder estable mientras cargan portadas Pexels del inicio (evita layout shift). */
export function LobbyHomeSkeleton() {
  return (
    <div
      className="mode-grid mode-grid-visual"
      aria-busy="true"
      aria-label="Cargando modos del lobby"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="lobby-card-skeleton" />
      ))}
    </div>
  );
}