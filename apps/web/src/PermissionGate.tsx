import type { ReactNode } from "react";

export function PermissionGate(props: {
  kind: "camera" | "microphone";
  onRequest: () => void;
  denied?: boolean;
  children?: ReactNode;
}) {
  const label =
    props.kind === "camera"
      ? "Necesitamos la cámara para esta prueba. La foto no se sube al servidor."
      : "Necesitamos el micrófono para reconocer tu voz. El audio no se guarda en el servidor.";

  if (props.denied) {
    return (
      <div className="permission-gate">
        <p className="error sm">{label}</p>
        <p className="muted sm">
          Revisa los permisos del navegador (candado en la barra de direcciones) y vuelve a intentar.
        </p>
        <button type="button" className="primary" onClick={props.onRequest}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!props.children) {
    return (
      <div className="permission-gate">
        <p className="muted sm">{label}</p>
        <button type="button" className="primary" onClick={props.onRequest}>
          Continuar
        </button>
      </div>
    );
  }

  return <>{props.children}</>;
}
