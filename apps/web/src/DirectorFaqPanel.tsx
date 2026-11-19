import { DIRECTOR_FAQ_IDS, type DirectorFaqId } from "@escapeai/shared";

const FAQ_LABELS: Record<DirectorFaqId, string> = {
  time_ok: "¿Vamos bien de tiempo?",
  puzzle_priority: "¿Qué reto importa ahora?",
  what_to_look: "¿Qué deberíamos mirar?",
  stuck_no_spoiler: "Atascados sin spoiler",
  should_request_hint: "¿Pedir pista ya?",
};

export function DirectorFaqPanel(props: {
  busy: boolean;
  onFaq: (faqId: DirectorFaqId) => void;
}) {
  return (
    <section className="panel glass" data-testid="escape-director-faq">
      <h2>Ayuda del director</h2>
      <p className="muted sm">Orientación sin códigos; las pistas oficiales siguen en cada reto.</p>
      <div className="faq-chips" role="group" aria-label="Preguntas al director">
        {DIRECTOR_FAQ_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="chip chip-action"
            data-testid={`escape-director-faq-${id}`}
            disabled={props.busy}
            onClick={() => props.onFaq(id)}
          >
            {FAQ_LABELS[id]}
          </button>
        ))}
      </div>
    </section>
  );
}