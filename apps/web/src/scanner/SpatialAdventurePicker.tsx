import type {
  EventPreview,
  SpatialAdventureProposal,
  SpatialProposalsResponse,
} from "@escapeai/shared";
import { useState } from "react";
import { createSpatialEvent, fetchSpatialProposals } from "../api";

export function SpatialAdventurePicker(props: {
  scannedEnvironmentId: string;
  spaceName: string;
  onBack: () => void;
  onEventCreated: (preview: EventPreview, proposal: SpatialAdventureProposal) => void;
}) {
  const [proposals, setProposals] = useState<SpatialAdventureProposal[] | null>(null);
  const [meta, setMeta] = useState<SpatialProposalsResponse | null>(null);
  const [selected, setSelected] = useState<SpatialAdventureProposal | null>(null);
  const [teamCount, setTeamCount] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchSpatialProposals(props.scannedEnvironmentId);
      setProposals(data.proposals);
      setMeta(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron generar propuestas");
    } finally {
      setBusy(false);
    }
  };

  const createEvent = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const { preview, proposal } = await createSpatialEvent(props.scannedEnvironmentId, {
        proposalId: selected.id,
        teamCount,
        subject: { name: props.spaceName },
        eventTitle: selected.title,
        durationMin: selected.durationMin,
      });
      props.onEventCreated(preview, proposal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el evento");
    } finally {
      setBusy(false);
    }
  };

  if (!proposals) {
    return (
      <section data-testid="escape-spatial-proposals">
        <h2>Generar aventuras</h2>
        <p className="muted">A partir del inventario confirmado, el motor propone hasta tres misiones distintas.</p>
        {error && <p className="error">{error}</p>}
        <button type="button" className="primary" disabled={busy} onClick={() => void loadProposals()}>
          Ver propuestas
        </button>
        <button type="button" className="ghost sm" onClick={props.onBack}>
          Volver
        </button>
      </section>
    );
  }

  if (selected) {
    return (
      <section data-testid="escape-spatial-prep">
        <h2>{selected.title}</h2>
        <p className="lede">{selected.premise}</p>
        <p className="muted">Misterio: {selected.mystery}</p>
        <p className="muted sm">
          Dificultad: {selected.difficulty} · {selected.puzzleCount} pruebas · ~{selected.durationMin} min
        </p>
        <h3>Preparación del escenario</h3>
        <ul>
          {selected.prepChecklist.length === 0 && <li className="muted">Solo objetos ya presentes (sin preparación extra).</li>}
          {selected.prepChecklist.map((item, i) => (
            <li key={i}>
              {item.kind === "organizer_setup" ? "🧰" : "📍"} {item.text}
            </li>
          ))}
        </ul>
        <label>
          Equipos
          <input
            type="number"
            min={2}
            max={5}
            value={teamCount}
            onChange={(e) => setTeamCount(Number(e.target.value) || 2)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" className="ghost" onClick={() => setSelected(null)}>
            Otra propuesta
          </button>
          <button type="button" className="primary" disabled={busy} data-testid="escape-spatial-create-event" onClick={() => void createEvent()}>
            Crear evento
          </button>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="escape-spatial-proposals">
      <h2>Elige una aventura</h2>
      {meta && (
        <p className="muted sm">
          Inventario v{meta.inventoryVersion} · {meta.proposals.length} conceptos
        </p>
      )}
      <div className="mode-grid">
        {proposals.map((p) => (
          <article key={p.id} className="template-card">
            <h3>{p.title}</h3>
            <p className="muted sm">{p.premise}</p>
            <p className="muted sm">Objetos: {p.objectsUsed.join(", ")}</p>
            <p className="muted sm">Mecánicas: {p.sensoryMechanics.join(", ")}</p>
            <button type="button" className="primary sm" onClick={() => setSelected(p)}>
              Elegir
            </button>
          </article>
        ))}
      </div>
      <button type="button" className="ghost sm" disabled={busy} onClick={() => void loadProposals()}>
        Regenerar propuestas
      </button>
    </section>
  );
}
