import type {
  DetectedObject,
  EnvironmentConstraints,
  EnvironmentType,
  EscapeObjectCategory,
  RawDetection,
  ScannedEnvironment,
  ScannedEnvironmentSummary,
  ScannedSite,
  ScannedSiteSummary,
} from "@escapeai/shared";
import {
  ENVIRONMENT_TYPES,
  OBJECT_CATEGORIES,
  categoryDisplayName,
  defaultEnvironmentConstraints,
  defaultLabelForCategory,
  fuseDetectionsIntoObjects,
  mapCameraError,
} from "@escapeai/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { PermissionGate } from "../PermissionGate";
import type { EventPreview } from "@escapeai/shared";
import {
  fetchScannedEnvironment,
  listScannedEnvironments,
  listScannedSites,
  saveScannedEnvironment,
} from "../api";
import { SiteAdventurePicker } from "./SiteAdventurePicker";
import { SiteBuilder } from "./SiteBuilder";
import { SpatialAdventurePicker } from "./SpatialAdventurePicker";
import { SCAN_ZONE_GUIDES } from "./scan-zones";
import { detectOnCanvas, getScannerCapability, loadObjectDetector, scannerDetectorId } from "./detector";
import { newObjectIdFromClient } from "./scanner-helpers";

type Step =
  | "choose"
  | "scan"
  | "review"
  | "constraints"
  | "done"
  | "adventures"
  | "event_created"
  | "load"
  | "site_builder"
  | "site_done"
  | "site_adventures"
  | "site_load";

type CaptureBatch = {
  captureId: string;
  zone: string;
  detections: RawDetection[];
};

const ENV_LABELS: Record<EnvironmentType, string> = {
  single_room: "Una habitación",
  living_room: "Salón",
  bedroom: "Dormitorio",
  office: "Oficina / local",
  kitchen: "Cocina",
  exterior: "Exterior",
};

export function ScannerFlow(props: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [name, setName] = useState("");
  const [environmentType, setEnvironmentType] = useState<EnvironmentType>("single_room");
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [constraints, setConstraints] = useState<EnvironmentConstraints>(defaultEnvironmentConstraints());
  const [saved, setSaved] = useState<ScannedEnvironment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [zoneIndex, setZoneIndex] = useState(0);
  const [capturedZones, setCapturedZones] = useState<Set<string>>(new Set());
  const [batches, setBatches] = useState<CaptureBatch[]>([]);
  const [cameraLive, setCameraLive] = useState(false);
  const [cameraErr, setCameraErr] = useState<string | null>(null);
  const [detectorReady, setDetectorReady] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [detectorMsg, setDetectorMsg] = useState<string | null>(null);

  const [savedList, setSavedList] = useState<ScannedEnvironmentSummary[]>([]);
  const [loadId, setLoadId] = useState("");
  const [eventPreview, setEventPreview] = useState<EventPreview | null>(null);
  const [savedSite, setSavedSite] = useState<ScannedSite | null>(null);
  const [siteList, setSiteList] = useState<ScannedSiteSummary[]>([]);
  const [editSiteId, setEditSiteId] = useState<string | undefined>();

  const webcamRef = useRef<Webcam>(null);
  const capability = useMemo(() => getScannerCapability(), []);

  const currentZone = SCAN_ZONE_GUIDES[zoneIndex] ?? SCAN_ZONE_GUIDES[0]!;
  const scanProgress = Math.round((capturedZones.size / SCAN_ZONE_GUIDES.length) * 100);

  const applyBatchesToObjects = useCallback((nextBatches: CaptureBatch[]) => {
    setObjects(
      fuseDetectionsIntoObjects(
        nextBatches.map((b) => ({ captureId: b.captureId, detections: b.detections })),
      ),
    );
  }, []);

  const finishToReview = useCallback(
    (nextBatches: CaptureBatch[]) => {
      applyBatchesToObjects(nextBatches);
      setCameraLive(false);
      setStep("review");
    },
    [applyBatchesToObjects],
  );

  const startScan = useCallback(async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Indica un nombre para el espacio.");
      return;
    }
    setError(null);
    setStep("scan");
    setObjects([]);
    setBatches([]);
    setCapturedZones(new Set());
    setZoneIndex(0);
    if (!capability.supported) {
      setManualMode(true);
      setDetectorMsg("Detección automática no disponible. Añade objetos manualmente en la revisión.");
      return;
    }
    setBusy(true);
    try {
      await loadObjectDetector();
      setDetectorReady(true);
      setDetectorMsg("Modelo listo. Recorre cada zona despacio.");
    } catch (err) {
      setManualMode(true);
      setDetectorMsg(err instanceof Error ? err.message : "No se pudo cargar el detector.");
    } finally {
      setBusy(false);
    }
  }, [capability.supported, name]);

  const captureZone = useCallback(async () => {
    setCameraErr(null);
    let dataUrl: string | undefined;
    try {
      dataUrl = webcamRef.current?.getScreenshot({ width: 640, height: 480 }) ?? undefined;
    } catch (err) {
      setCameraErr(mapCameraError(err));
      return;
    }
    if (!dataUrl) {
      setCameraErr("No se pudo capturar. Espera un instante e inténtalo de nuevo.");
      return;
    }
    const shot = dataUrl;

    const captureId = newObjectIdFromClient();
    const zoneKey = currentZone.zone;
    let detections: RawDetection[] = [];

    if (!manualMode && detectorReady) {
      setBusy(true);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("decode"));
          img.src = shot;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0);
        detections = await detectOnCanvas(canvas);
      } catch (err) {
        setCameraErr(err instanceof Error ? err.message : "Error en detección.");
      } finally {
        setBusy(false);
      }
    }

    const batch: CaptureBatch = { captureId, zone: zoneKey, detections };
    const nextBatches = [...batches, batch];
    setBatches(nextBatches);
    setCapturedZones((prev) => new Set(prev).add(zoneKey));

    if (zoneIndex < SCAN_ZONE_GUIDES.length - 1) {
      setZoneIndex((i) => i + 1);
    } else {
      finishToReview(nextBatches);
    }
  }, [batches, currentZone.zone, detectorReady, finishToReview, manualMode, zoneIndex]);

  const updateObject = (id: string, patch: Partial<DetectedObject>) => {
    setObjects((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const removeObject = (id: string) => {
    setObjects((list) => list.filter((o) => o.id !== id));
  };

  const addManualObject = () => {
    setObjects((list) => [
      ...list,
      {
        id: newObjectIdFromClient(),
        category: "unknown",
        label: defaultLabelForCategory("unknown"),
        quantity: 1,
        confidence: 1,
        confirmed: true,
        interactable: true,
        movable: false,
        canHideClue: false,
        restricted: false,
      },
    ]);
  };

  const persist = async () => {
    setBusy(true);
    setError(null);
    try {
      const env = await saveScannedEnvironment({
        id: saved?.id,
        name: name.trim(),
        environmentType,
        objects,
        constraints,
        scanMetadata: {
          captureCount: batches.length,
          detectorId: manualMode ? "manual" : scannerDetectorId(),
          completedAt: new Date().toISOString(),
        },
      });
      setSaved(env);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const loadSavedList = async () => {
    setBusy(true);
    try {
      const items = await listScannedEnvironments();
      setSavedList(items);
      setStep("load");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al listar");
    } finally {
      setBusy(false);
    }
  };

  const loadOne = async (id: string) => {
    setBusy(true);
    try {
      const env = await fetchScannedEnvironment(id);
      setSaved(env);
      setName(env.name);
      setEnvironmentType(env.environmentType);
      setObjects(env.objects);
      setConstraints(env.constraints);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No encontrado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="shell lobby scanner-flow" data-testid="escape-scanner-flow">
      <button type="button" className="ghost sm back-link" onClick={props.onBack}>
        ← Volver
      </button>
      <header className="lobby-hero">
        <p className="eyebrow">ScannerAI</p>
        <h1 className="display">Escanear espacio</h1>
        <p className="lede muted">Las fotos se procesan solo en tu móvil. Al guardar, el servidor recibe únicamente el inventario.</p>
      </header>
      {error && <p className="error">{error}</p>}

      {step === "choose" && (
        <form
          className="wizard wizard-wide"
          onSubmit={(e) => {
            e.preventDefault();
            void startScan();
          }}
        >
          <label>
            Nombre del espacio
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </label>
          <label>
            Tipo
            <select value={environmentType} onChange={(e) => setEnvironmentType(e.target.value as EnvironmentType)}>
              {ENVIRONMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENV_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <button type="submit" className="primary" disabled={busy} data-testid="escape-scanner-start">
              Empezar escaneo
            </button>
            <button type="button" className="ghost" onClick={() => void loadSavedList()} disabled={busy}>
              Recuperar inventario
            </button>
            <button type="button" className="ghost" onClick={() => { setEditSiteId(undefined); setStep("site_builder"); }} disabled={busy}>
              Recinto multi-habitación
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => {
                void listScannedSites()
                  .then((items) => {
                    setSiteList(items);
                    setStep("site_load");
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Error"));
              }}
            >
              Recintos guardados
            </button>
          </div>
        </form>
      )}

      {step === "scan" && (
        <section className="scanner-capture" data-testid="escape-scanner-capture">
          {detectorMsg && <p className="muted sm">{detectorMsg}</p>}
          <div className="scanner-progress">
            <span>Progreso: {scanProgress}%</span>
            <span>
              Zona {zoneIndex + 1}/{SCAN_ZONE_GUIDES.length}: {currentZone.title}
            </span>
          </div>
          <p className="muted">{currentZone.hint}</p>
          {cameraErr && <p className="error sm">{cameraErr}</p>}
          <div className="scanner-camera-wrap">
            {cameraLive ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.72}
                videoConstraints={{ facingMode: "environment", width: 640, height: 480 }}
                className="camera-preview"
                onUserMediaError={(err) => {
                  setCameraErr(mapCameraError(err));
                  setCameraLive(false);
                }}
              />
            ) : (
              <PermissionGate
                kind="camera"
                denied={Boolean(cameraErr)}
                onRequest={() => {
                  setCameraErr(null);
                  setCameraLive(true);
                }}
              />
            )}
          </div>
          <div className="row camera-actions">
            {cameraLive && (
              <button
                type="button"
                className="primary"
                disabled={busy}
                data-testid="escape-scanner-capture-zone"
                onClick={() => void captureZone()}
              >
                Capturar zona
              </button>
            )}
            <button type="button" className="ghost" onClick={() => finishToReview(batches)}>
              Terminar y revisar
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section data-testid="escape-scanner-review">
          <h2>Revisa el inventario</h2>
          <p className="muted sm">Confirma, corrige o elimina detecciones antes de guardar.</p>
          <ul className="scanner-object-list">
            {objects.map((obj) => (
              <li key={obj.id} className="scanner-object-row">
                <label className="scanner-confirm">
                  <input
                    type="checkbox"
                    checked={obj.confirmed}
                    onChange={(e) => updateObject(obj.id, { confirmed: e.target.checked })}
                  />
                  Confirmar
                </label>
                <select
                  value={obj.category}
                  onChange={(e) =>
                    updateObject(obj.id, {
                      category: e.target.value as EscapeObjectCategory,
                      label: defaultLabelForCategory(e.target.value as EscapeObjectCategory),
                    })
                  }
                >
                  {OBJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryDisplayName(c)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={obj.quantity}
                  onChange={(e) => updateObject(obj.id, { quantity: Number(e.target.value) || 1 })}
                  aria-label="Cantidad"
                />
                <button type="button" className="ghost sm" onClick={() => removeObject(obj.id)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ghost sm" onClick={addManualObject}>
            + Añadir objeto manual
          </button>
          <div className="row">
            <button type="button" className="primary" onClick={() => setStep("constraints")}>
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "constraints" && (
        <section>
          <h2>Reglas del espacio</h2>
          <label className="scanner-check">
            <input
              type="checkbox"
              checked={constraints.allowMovement}
              onChange={(e) => setConstraints({ ...constraints, allowMovement: e.target.checked })}
            />
            Los jugadores pueden moverse libremente
          </label>
          <label className="scanner-check">
            <input
              type="checkbox"
              checked={constraints.allowOpeningFurniture}
              onChange={(e) => setConstraints({ ...constraints, allowOpeningFurniture: e.target.checked })}
            />
            Pueden abrir cajones y armarios
          </label>
          <label className="scanner-check">
            <input
              type="checkbox"
              checked={constraints.organizerCanPlaceProps}
              onChange={(e) => setConstraints({ ...constraints, organizerCanPlaceProps: e.target.checked })}
            />
            Puedo colocar tarjetas, QR u objetos extra
          </label>
          <div className="row">
            <button type="button" className="ghost" onClick={() => setStep("review")}>
              Atrás
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy}
              data-testid="escape-scanner-save"
              onClick={() => void persist()}
            >
              Guardar inventario
            </button>
          </div>
        </section>
      )}

      {step === "done" && saved && (
        <section data-testid="escape-scanner-done">
          <h2>Inventario guardado</h2>
          <p>
            ID: <code>{saved.id}</code> (versión {saved.version})
          </p>
          <p className="muted">
            Los eventos ya creados no cambian si editas este inventario después.
          </p>
          <div className="row">
            <button type="button" className="primary" onClick={() => setStep("adventures")}>
              Generar aventuras
            </button>
            <button type="button" className="ghost" onClick={() => setStep("site_builder")}>
              Añadir a un recinto
            </button>
            <button type="button" className="ghost" onClick={props.onBack}>
              Volver al inicio
            </button>
          </div>
        </section>
      )}

      {step === "site_load" && (
        <section data-testid="escape-site-load">
          <h2>Recintos guardados</h2>
          <ul className="scanner-saved-list">
            {siteList.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setEditSiteId(s.id);
                    setStep("site_builder");
                  }}
                >
                  {s.name} — {s.roomCount} hab. {s.city ? `· ${s.city}` : ""}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ghost" onClick={() => setStep("choose")}>
            Volver
          </button>
        </section>
      )}

      {step === "site_builder" && (
        <SiteBuilder
          seedRoom={saved ?? undefined}
          existingSiteId={editSiteId}
          onBack={() => setStep(editSiteId ? "site_load" : saved ? "done" : "choose")}
          onSaved={(site) => {
            setSavedSite(site);
            setEditSiteId(undefined);
            setStep("site_done");
          }}
        />
      )}

      {step === "site_done" && savedSite && (
        <section data-testid="escape-site-done">
          <h2>Recinto guardado</h2>
          <p>
            ID: <code>{savedSite.id}</code> · {savedSite.roomIds.length} habitaciones
          </p>
          <button type="button" className="primary" onClick={() => setStep("site_adventures")}>
            Generar aventuras del recinto
          </button>
        </section>
      )}

      {step === "site_adventures" && savedSite && (
        <SiteAdventurePicker
          scannedSiteId={savedSite.id}
          siteName={savedSite.name}
          onBack={() => setStep("site_done")}
          onEventCreated={(preview) => {
            setEventPreview(preview);
            setStep("event_created");
          }}
        />
      )}

      {step === "adventures" && saved && (
        <SpatialAdventurePicker
          scannedEnvironmentId={saved.id}
          spaceName={saved.name}
          onBack={() => setStep("done")}
          onEventCreated={(preview) => {
            setEventPreview(preview);
            setStep("event_created");
          }}
        />
      )}

      {step === "event_created" && eventPreview && (
        <section data-testid="escape-spatial-event-created">
          <h2>Evento listo</h2>
          <p>
            Código de acceso: <strong className="join-code">{eventPreview.joinCode}</strong>
          </p>
          <p className="muted">{eventPreview.title}</p>
          <button type="button" className="primary" onClick={props.onBack}>
            Volver al inicio
          </button>
        </section>
      )}

      {step === "load" && (
        <section data-testid="escape-scanner-load">
          <h2>Inventarios guardados</h2>
          <ul className="scanner-saved-list">
            {savedList.map((item) => (
              <li key={item.id}>
                <button type="button" className="ghost" onClick={() => void loadOne(item.id)}>
                  {item.name} — {item.confirmedCount} objetos · {new Date(item.updatedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
          <label>
            O por ID
            <input value={loadId} onChange={(e) => setLoadId(e.target.value)} />
          </label>
          <button type="button" className="primary" disabled={!loadId.trim()} onClick={() => void loadOne(loadId.trim())}>
            Cargar
          </button>
        </section>
      )}
    </main>
  );
}
