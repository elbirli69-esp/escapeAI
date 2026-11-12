import type { PublicPuzzle } from "@escapeai/shared";

const TYPE_HINT: Record<string, string> = {
  sound: "Escucha antes de responder",
  voice: "Micrófono en mano",
  camera: "Usa la cámara del móvil",
  visual: "Observa la imagen con calma",
  location: "GPS y entorno real",
  code: "Código o combinación",
  inventory: "Objeto del inventario",
};

export function PuzzleInstructionCard(props: { puzzle: PublicPuzzle }) {
  const { puzzle } = props;
  if (!puzzle.cardImage) return null;

  return (
    <figure className="puzzle-instruction-card">
      {puzzle.cardImage ? (
        <img
          src={puzzle.cardImage}
          alt=""
          className="puzzle-instruction-img"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="puzzle-instruction-img puzzle-instruction-fallback" aria-hidden />
      )}
      <figcaption className="puzzle-instruction-caption">
        <span className="card-eyebrow">{TYPE_HINT[puzzle.puzzleType] ?? "Reto"}</span>
        <strong className="puzzle-instruction-title">{puzzle.label ?? puzzle.id}</strong>
        <p className="puzzle-instruction-prompt">{puzzle.prompt}</p>
      </figcaption>
    </figure>
  );
}
