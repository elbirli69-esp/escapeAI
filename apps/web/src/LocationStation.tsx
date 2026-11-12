import type { PublicPuzzle } from "@escapeai/shared";
import { haversineDistanceMeters } from "@escapeai/shared";
import { useCallback, useState } from "react";
import { PermissionGate } from "./PermissionGate";
import { getBrowserPosition } from "./lib/geo-position";

type LocationActionSender = (action: {
  type: "submit_location";
  puzzleId: string;
  lat: number;
  lon: number;
  accuracyMeters?: number;
}) => void;

export function LocationStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: LocationActionSender;
}) {
  const { puzzle } = props;
  const targetLat = puzzle.targetLat;
  const targetLon = puzzle.targetLon;
  const radius = puzzle.radiusMeters ?? 40;
  const mode = puzzle.locationMode ?? "reach";
  const areaContext = puzzle.locationIntent === "area_context";
  const [gateOpen, setGateOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [lastDistance, setLastDistance] = useState<number | null>(null);

  const openMaps = useCallback(() => {
    if (targetLat === undefined || targetLon === undefined) return;
    const q = `${targetLat},${targetLon}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank");
  }, [targetLat, targetLon]);

  const confirmHere = useCallback(async () => {
    if (props.busy) return;
    setStatus(null);
    setDenied(false);
    try {
      const pos = await getBrowserPosition();
      if (targetLat !== undefined && targetLon !== undefined) {
        const d = haversineDistanceMeters(
          { lat: pos.lat, lon: pos.lon },
          { lat: targetLat, lon: targetLon },
        );
        setLastDistance(Math.round(d));
      }
      props.onAction({
        type: "submit_location",
        puzzleId: puzzle.id,
        lat: pos.lat,
        lon: pos.lon,
        accuracyMeters: pos.accuracyMeters,
      });
      setStatus(
        `Enviado (${pos.accuracyMeters.toFixed(0)} m de precisión estimada). El servidor valida el radio.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de GPS";
      if (msg.includes("denegado")) setDenied(true);
      setStatus(msg);
    }
  }, [props, puzzle.id, targetLat, targetLon]);

  if (targetLat === undefined || targetLon === undefined) {
    return <p className="error sm">Puzzle sin coordenadas configuradas.</p>;
  }

  return (
    <div className="location-station">
      <p className="puzzle-prompt">{puzzle.prompt}</p>
      {puzzle.waypointLabel && (
        <p className="muted sm">
          {areaContext ? (
            <>
              Zona urbana: <strong>{puzzle.waypointLabel}</strong> (radio amplio ~{Math.round(radius / 1000)} km;
              no es un waypoint interior)
            </>
          ) : (
            <>
              Objetivo: <strong>{puzzle.waypointLabel}</strong> (radio ~{radius} m)
            </>
          )}
        </p>
      )}
      <p className="muted sm privacy">
        {areaContext
          ? "Una lectura puntual de GPS ayuda a situar ciudad o barrio para el quiz del entorno. No usamos GPS para moverte entre habitaciones."
          : "Solo enviamos una lectura puntual de lat/lon al motor para comprobar distancia. No guardamos historial de movimiento."}
      </p>

      <PermissionGate
        kind="geolocation"
        denied={denied}
        onRequest={() => {
          setDenied(false);
          setGateOpen(true);
        }}
      >
        {gateOpen ? (
          <div className="row stack">
            <button type="button" className="ghost" onClick={openMaps}>
              Abrir en mapas
            </button>
            <button
              type="button"
              className="primary"
              disabled={props.busy}
              onClick={() => void confirmHere()}
            >
              Estoy aquí
            </button>
          </div>
        ) : null}
      </PermissionGate>

      {lastDistance !== null && (
        <p className="muted sm">Última medida local: ~{lastDistance} m al objetivo (orientativa).</p>
      )}
      {status && <p className={denied ? "error sm" : "muted sm"}>{status}</p>}

      {mode === "quiz" && puzzle.completedSteps.includes("arrive") && (
        <p className="success sm">
          Posición confirmada. Responde abajo{puzzle.quizPrompt ? `: ${puzzle.quizPrompt}` : "."}
        </p>
      )}
    </div>
  );
}
