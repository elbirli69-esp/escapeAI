import type {
  EventPreview,
  SiteProposalsResponse,
  SpatialAdventureProposal,
} from "@escapeai/shared";
import { useState } from "react";
import { createSpatialSiteEvent, fetchSpatialSiteProposals } from "../api";

export function SiteAdventurePicker(props: {
  scannedSiteId: string;
  siteName: string;
  onBack: () => void;
  onEventCreated: (preview: EventPreview, proposal: SpatialAdventureProposal) => void;
}) {
  const [proposals, setProposals] = useState<SpatialAdventureProposal[] | null>(null);
  const [meta, setMeta] = useState<SiteProposalsResponse | null>(null);
  const [selected, setSelected] = useState<SpatialAdventureProposal | null>(null);
  const [teamCount, setTeamCount] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchSpatialSiteProposals(props.scannedSiteId);
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
      const { preview, proposal } = await createSpatialSiteEvent(props.scannedSiteId, {
        proposalId: selected.id,
        teamCount,
        subject: { name: props.siteName },
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
      <section data-testid="escape-site-proposals">
        <h2>Aventuras del recinto</h2>
        <p className="muted">Tres propuestas que cruzan habitaciones enlazadas (GPS solo para contexto urbano).</p>
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
      <section data-testid="escape-site-prep">
        <h2>{selected.title}</h2>
        <p className="lede">{selected.premise}</p>
        <h3>Preparación</h3>
        <ul>
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
        <p className="muted sm privacy">
          El GPS en interiores puede usarse para situar ciudad/barrio y preguntas del entorno, nunca como waypoint entre
          habitaciones.
        </p>
        <SiteEventActions busy={busy} onBack={() => setSelected(null)} onCreate={() => void createEvent()} />
      </section>
    );
  }

  return (
    <section data-testid="escape-site-proposals">
      <h2>Elige una aventura</h2>
      {meta && (
        <p className="muted sm">
          Recinto v{meta.siteVersion} · {Object.keys(meta.roomInventoryVersions).length} habitaciones
        </p>
      )}
      <div className="mode-grid">
        {proposals.map((p) => (
          <article key={p.id} className="template-card">
            <h3>{p.title}</h3>
            <p className="muted sm">{p.premise}</p>
            <button type="button" className="primary sm" onClick={() => setSelected(p)}>
              Elegir
            </button>
          </article>
        ))}
      </div>
      <button type="button" className="ghost sm" onClick={props.onBack}>
        Volver
      </button>
    </section>
  );
}

function SiteEventActions(props: { busy: boolean; onBack: () => void; onCreate: () => void }) {
  return (
    <div className="row">
      <button type="button" className="ghost" onClick={props.onBack}>
        Otra propuesta
      </button>
      <button
        type="button"
        className="primary"
        disabled={props.busy}
        data-testid="escape-site-create-event"
        onClick={props.onCreate}
      >
        Crear evento
      </button>
    </div>
  );
}
