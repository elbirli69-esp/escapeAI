import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { buildEventJoinUrl } from "./lib/event-join-url";

export function EventJoinQr(props: {
  joinCode: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const target = buildEventJoinUrl(props.joinCode);
    void QRCode.toDataURL(target, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: props.size === "lg" ? 320 : props.size === "md" ? 220 : 168,
      color: { dark: "#0c1222ff", light: "#ffffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [props.joinCode, props.size]);

  if (!dataUrl) return null;

  return (
    <figure className={`event-join-qr size-${props.size ?? "sm"}`}>
      <img
        src={dataUrl}
        alt={props.label ?? `Código QR para unirse al evento ${props.joinCode}`}
        width={168}
        height={168}
        decoding="async"
      />
      <figcaption className="meta">Escanea para abrir la invitación</figcaption>
    </figure>
  );
}
