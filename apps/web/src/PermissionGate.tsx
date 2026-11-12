import type { ReactNode } from "react";

export function PermissionGate(props: {
  kind: "camera" | "microphone" | "geolocation";
  onRequest: () => void;
  denied?: boolean;
  children?: ReactNode;
}) {
  const label =
    props.kind === "camera"
      ? "Necesitamos la cámara para esta prueba. La foto no se sube al servidor."
      : props.kind === "geolocation"
        ? "Para esta prueba el navegador pedirá acceso a tu ubicación. Solo mandamos una coordenada al validar «Estoy aquí»; no rastreamos tu ruta."
        : "Al pulsar «Hablar ahora» el navegador pedirá permiso de micrófono. El reconocimiento usa la Web Speech API (en muchos navegadores el audio se procesa en la nube del proveedor, no es offline). No guardamos audio en nuestro servidor.";

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
