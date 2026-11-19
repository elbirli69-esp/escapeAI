import type { InteractionStep, PublicPuzzle } from "@escapeai/shared";
import type { ReactNode } from "react";

export type ParsedHybridHints = {
  sala?: string;
  movil?: string;
  other: string[];
};

export function parseHybridHints(hints?: string[]): ParsedHybridHints {
  const other: string[] = [];
  let sala: string | undefined;
  let movil: string | undefined;
  for (const h of hints ?? []) {
    if (h.startsWith("En la sala:")) {
      sala = h.replace(/^En la sala:\s*/, "").trim();
    } else if (h.startsWith("En el móvil:")) {
      movil = h.replace(/^En el móvil:\s*/, "").trim();
    } else {
      other.push(h);
    }
  }
  return { sala, movil, other };
}

export function puzzleUsesHybridSteps(hints?: string[]): boolean {
  const { sala, movil } = parseHybridHints(hints);
  return Boolean(sala && movil);
}

export function HybridStationSteps(props: {
  puzzle: PublicPuzzle;
  salaDone: boolean;
  onConfirmSala?: () => void;
  salaBusy?: boolean;
  inventoryHasRequiredItem?: boolean;
  children?: ReactNode;
}) {
  const { sala, movil, other } = parseHybridHints(props.puzzle.interactionHints);
  if (!sala && !movil) {
    return (
      <>
        {other.map((h) => (
          <p key={h} className="muted sm">
            {h}
          </p>
        ))}
        {props.children}
      </>
    );
  }

  const roomReady = props.puzzle.completedSteps.includes("room_ready" as InteractionStep);
  const salaComplete =
    props.salaDone ||
    roomReady ||
    (props.puzzle.puzzleType === "inventory" && props.inventoryHasRequiredItem);

  return (
    <div className="hybrid-station" data-testid="escape-hybrid-station">
      {sala && (
        <div
          className={`hybrid-step hybrid-step-sala ${salaComplete ? "done" : "active"}`}
          data-testid="escape-hybrid-sala"
        >
          <span className="hybrid-step-label">1 · En la sala</span>
          <p className="muted sm">{sala}</p>
          {!salaComplete && props.onConfirmSala && props.puzzle.puzzleType === "camera" && (
            <button
              type="button"
              className="secondary sm"
              disabled={props.salaBusy}
              data-testid="escape-hybrid-sala-confirm"
              onClick={props.onConfirmSala}
            >
              Listo en sala
            </button>
          )}
          {salaComplete && <p className="meta sm">✓ Preparación en sala</p>}
        </div>
      )}
      {movil && (
        <div
          className={`hybrid-step hybrid-step-movil ${salaComplete ? "active" : "locked"}`}
          data-testid="escape-hybrid-movil"
        >
          <span className="hybrid-step-label">2 · En el móvil</span>
          <p className="muted sm">{movil}</p>
          {!salaComplete && (
            <p className="meta sm">Completa el paso en sala antes de continuar aquí.</p>
          )}
          {salaComplete && props.children}
        </div>
      )}
      {other.map((h) => (
        <p key={h} className="muted sm">
          {h}
        </p>
      ))}
    </div>
  );
}