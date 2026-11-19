import type { PublicDeductionSuspect, PublicPuzzle } from "@escapeai/shared";
import { useState } from "react";

export function WhodunitPanel(props: {
  puzzle: PublicPuzzle;
  clueIds: string[];
  busy: boolean;
  onAccuse: (suspectId: string) => void;
}) {
  const suspects = props.puzzle.deductionSuspects ?? [];
  const [selected, setSelected] = useState<string>("");
  const readyClues = new Set(props.clueIds);
  const required = new Set(
    suspects.flatMap((s) => s.traits.map((t) => t.clearingClueId)),
  );
  const missingRequired = [...required].filter((id) => !readyClues.has(id)).length;

  return (
    <div className="whodunit-panel" data-testid="escape-whodunit-panel">
      <p className="muted sm">{props.puzzle.prompt}</p>
      {missingRequired > 0 && (
        <p className="meta sm" data-testid="escape-whodunit-missing">
          Faltan pruebas en el cuaderno antes de acusar con seguridad.
        </p>
      )}
      <ul className="whodunit-suspects">
        {suspects.map((s) => (
          <SuspectCard
            key={s.id}
            suspect={s}
            selected={selected === s.id}
            clueIds={readyClues}
            onSelect={() => setSelected(s.id)}
          />
        ))}
      </ul>
      <button
        type="button"
        className="primary wide"
        data-testid="escape-whodunit-submit"
        disabled={props.busy || !selected}
        onClick={() => props.onAccuse(selected)}
      >
        Presentar acusación
      </button>
    </div>
  );
}

function SuspectCard(props: {
  suspect: PublicDeductionSuspect;
  selected: boolean;
  clueIds: Set<string>;
  onSelect: () => void;
}) {
  return (
    <li className={`whodunit-suspect ${props.selected ? "selected" : ""}`}>
      <label className="whodunit-suspect-head">
        <input
          type="radio"
          name="suspect"
          checked={props.selected}
          onChange={props.onSelect}
          data-testid={`escape-whodunit-suspect-${props.suspect.id}`}
        />
        <strong>{props.suspect.name}</strong>
      </label>
      <ul className="whodunit-traits">
        {props.suspect.traits.map((t) => {
          const known = props.clueIds.has(t.clearingClueId);
          return (
            <li key={t.id} className={known ? "trait-known" : "trait-unknown"}>
              {known ? t.label : "— prueba pendiente —"}
            </li>
          );
        })}
      </ul>
    </li>
  );
}