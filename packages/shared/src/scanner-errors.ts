export type ScannerCapability =
  | { supported: true; backend: "webgl" | "wasm" | "cpu" }
  | { supported: false; reason: string };

export function mapCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  const message = err instanceof Error ? err.message : String(err);
  if (name === "NotAllowedError" || /permission/i.test(message)) {
    return "Permiso de cámara denegado. Actívalo en ajustes del navegador o añade objetos a mano.";
  }
  if (name === "NotFoundError" || /not found/i.test(message)) {
    return "No se encontró cámara en este dispositivo.";
  }
  if (name === "NotReadableError" || /in use/i.test(message)) {
    return "La cámara está en uso por otra aplicación.";
  }
  if (name === "OverconstrainedError") {
    return "La cámara no admite el modo solicitado. Prueba otra orientación.";
  }
  return "No se pudo abrir la cámara. Puedes continuar añadiendo objetos manualmente.";
}

export function mapDetectorLoadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/webgl/i.test(message)) {
    return "Este dispositivo no pudo iniciar la detección (WebGL). Usa el modo manual.";
  }
  return "No se pudo cargar el detector. Añade objetos manualmente.";
}
