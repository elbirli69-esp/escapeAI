import { createEventLoadingHint } from "./lib/create-event-loading";

export function CreateEventLoadingPanel(props: { elapsedMs: number }) {
  const hint = createEventLoadingHint(props.elapsedMs);
  const seconds = Math.floor(props.elapsedMs / 1000);

  return (
    <div
      className="wizard-create-busy-panel glass"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      id="escape-event-create-loading"
      data-testid="escape-event-create-loading"
    >
      <div className="wizard-create-busy-spinner" aria-hidden />
      <p className="wizard-create-busy-title">Generando tu evento</p>
      <p className="wizard-create-busy-hint">{hint}</p>
      {seconds >= 3 && (
        <p className="wizard-create-busy-elapsed muted sm">
          {seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`}
        </p>
      )}
    </div>
  );
}