import type {
  SaveScannedSiteRequest,
  ScannedEnvironment,
  ScannedEnvironmentSummary,
  ScannedSite,
  SiteGeoContext,
  SiteLink,
  SiteMapLayout,
} from "@escapeai/shared";
import { SiteMapSchematic } from "./SiteMapSchematic";
import { DEFAULT_SITE_AREA_RADIUS_METERS } from "@escapeai/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchScannedSite, listScannedEnvironments, saveScannedSite } from "../api";
import { getBrowserPosition } from "../lib/geo-position";

function newLinkId(): string {
  return `link-${Math.random().toString(36).slice(2, 10)}`;
}

function buildLinksForLayout(roomIds: string[], layout: SiteMapLayout, prev?: SiteLink[]): SiteLink[] {
  const labelFor = (from: string, to: string) =>
    prev?.find((l) => l.fromRoomId === from && l.toRoomId === to)?.label ?? "Pasaje";
  const kindFor = (from: string, to: string) =>
    prev?.find((l) => l.fromRoomId === from && l.toRoomId === to)?.transitionKind ?? "door";

  if (layout === "hub" && roomIds.length > 1) {
    const hub = roomIds[0]!;
    return roomIds.slice(1).map((to) => ({
      id: prev?.find((l) => l.fromRoomId === hub && l.toRoomId === to)?.id ?? newLinkId(),
      fromRoomId: hub,
      toRoomId: to,
      label: labelFor(hub, to),
      transitionKind: kindFor(hub, to),
      confirmed: false,
    }));
  }

  const links: SiteLink[] = [];
  for (let i = 0; i < roomIds.length - 1; i++) {
    const from = roomIds[i]!;
    const to = roomIds[i + 1]!;
    links.push({
      id: prev?.find((l) => l.fromRoomId === from && l.toRoomId === to)?.id ?? newLinkId(),
      fromRoomId: from,
      toRoomId: to,
      label: labelFor(from, to),
      transitionKind: kindFor(from, to),
      confirmed: false,
    });
  }
  return links;
}

export function SiteBuilder(props: {
  seedRoom?: ScannedEnvironment;
  existingSiteId?: string;
  onBack: () => void;
  onSaved: (site: ScannedSite) => void;
}) {
  const [inventories, setInventories] = useState<ScannedEnvironmentSummary[]>([]);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(props.seedRoom ? [props.seedRoom.id] : []);
  const [mapLayout, setMapLayout] = useState<SiteMapLayout>("linear");
  const [links, setLinks] = useState<SiteLink[]>([]);
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [anchorLat, setAnchorLat] = useState<number | undefined>();
  const [anchorLon, setAnchorLon] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [existingId, setExistingId] = useState<string | undefined>(props.existingSiteId);

  const loadInventories = useCallback(async () => {
    const items = await listScannedEnvironments();
    setInventories(items);
  }, []);

  useEffect(() => {
    void loadInventories().catch(() => setInventories([]));
  }, [loadInventories]);

  useEffect(() => {
    if (!props.existingSiteId) return;
    void (async () => {
      try {
        const site = await fetchScannedSite(props.existingSiteId!);
        setName(site.name);
        setSelectedIds(site.roomIds);
        setLinks(site.links);
        setMapLayout(site.mapLayout);
        setCity(site.geoContext?.city ?? "");
        setNeighborhood(site.geoContext?.neighborhood ?? "");
        setAnchorLat(site.geoContext?.anchorLat);
        setAnchorLon(site.geoContext?.anchorLon);
        setExistingId(site.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo cargar el recinto");
      }
    })();
  }, [props.existingSiteId]);

  const mapRooms = useMemo(
    () =>
      selectedIds.map((id) => ({
        id,
        label: inventories.find((i) => i.id === id)?.name ?? id.slice(0, 8),
      })),
    [selectedIds, inventories],
  );

  const syncLinks = (roomIds: string[], layout: SiteMapLayout) => {
    setLinks((prev) => buildLinksForLayout(roomIds, layout, prev));
  };

  const toggleRoom = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      syncLinks(next, mapLayout);
      return next;
    });
  };

  const moveRoom = (index: number, dir: -1 | 1) => {
    setSelectedIds((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      syncLinks(next, mapLayout);
      return next;
    });
  };

  const changeLayout = (layout: SiteMapLayout) => {
    setMapLayout(layout);
    syncLinks(selectedIds, layout);
  };

  const updateLinkLabel = (linkId: string, label: string) => {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, label } : l)));
  };

  const updateLinkKind = (linkId: string, transitionKind: SiteLink["transitionKind"]) => {
    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, transitionKind } : l)));
  };

  const captureAnchor = async () => {
    setGeoStatus(null);
    try {
      const pos = await getBrowserPosition();
      setAnchorLat(pos.lat);
      setAnchorLon(pos.lon);
      setGeoStatus(
        `Ancla aproximada guardada (${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}). Solo para quizzes de ciudad/barrio.`,
      );
    } catch (e) {
      setGeoStatus(e instanceof Error ? e.message : "No se pudo leer GPS");
    }
  };

  const persist = async () => {
    if (name.trim().length < 2) {
      setError("Indica un nombre de recinto.");
      return;
    }
    if (selectedIds.length < 2) {
      setError("Selecciona al menos dos habitaciones.");
      return;
    }
    const geoContext: SiteGeoContext | undefined =
      city.trim().length >= 2
        ? {
            city: city.trim(),
            neighborhood: neighborhood.trim() || undefined,
            anchorLat,
            anchorLon,
            areaRadiusMeters: DEFAULT_SITE_AREA_RADIUS_METERS,
          }
        : undefined;

    const body: SaveScannedSiteRequest = {
      id: existingId,
      name: name.trim(),
      roomIds: selectedIds,
      links: links.map((l) => ({ ...l, confirmed: true })),
      mapLayout,
      geoContext,
    };

    setBusy(true);
    setError(null);
    try {
      const site = await saveScannedSite(body);
      props.onSaved(site);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el recinto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-testid="escape-site-builder">
      <h2>Recinto multi-habitación</h2>
      <p className="muted sm">
        Enlaza inventarios ya guardados. El GPS opcional solo alimenta preguntas sobre ciudad o barrio; no marca
        waypoints entre habitaciones.
      </p>
      <label>
        Nombre del recinto
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Piso, local, oficina…" />
      </label>

      <h3>Habitaciones (orden del recorrido)</h3>
      <ul className="scanner-saved-list">
        {inventories.map((item) => (
          <li key={item.id}>
            <label className="scanner-check">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleRoom(item.id)}
              />
              {item.name} — {item.confirmedCount} objetos
            </label>
          </li>
        ))}
      </ul>

      {selectedIds.length > 0 && (
        <ol className="site-map-order-list">
          {mapRooms.map((room, i) => (
            <li key={room.id}>
              {room.label}
              <button type="button" className="ghost sm" onClick={() => moveRoom(i, -1)}>
                ↑
              </button>
              <button type="button" className="ghost sm" onClick={() => moveRoom(i, 1)}>
                ↓
              </button>
            </li>
          ))}
        </ol>
      )}

      <SiteMapSchematic
        rooms={mapRooms}
        links={links}
        mapLayout={mapLayout}
        onLayoutChange={changeLayout}
        onLinkLabelChange={updateLinkLabel}
        onLinkKindChange={updateLinkKind}
      />

      <h3>Contexto urbano (opcional)</h3>
      <label>
        Ciudad
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Para quizzes del entorno" />
      </label>
      <label>
        Barrio
        <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
      </label>
      <button type="button" className="ghost" onClick={() => void captureAnchor()}>
        Capturar GPS aproximado (ventana / exterior)
      </button>
      {geoStatus && <p className="muted sm">{geoStatus}</p>}

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="button" className="ghost" onClick={props.onBack}>
          Cancelar
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy}
          data-testid="escape-site-save"
          onClick={() => void persist()}
        >
          Guardar recinto
        </button>
      </div>
    </section>
  );
}
