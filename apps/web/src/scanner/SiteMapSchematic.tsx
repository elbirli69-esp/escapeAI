import type { ReactNode } from "react";
import type { SiteLink, SiteMapLayout } from "@escapeai/shared";

export type SiteMapRoom = {
  id: string;
  label: string;
  isOutdoor?: boolean;
};

type EdgeView = {
  link: SiteLink;
  fromIndex: number;
  toIndex: number;
};

function layoutEdges(rooms: SiteMapRoom[], links: SiteLink[]): EdgeView[] {
  const indexById = new Map(rooms.map((r, i) => [r.id, i]));
  const edges: EdgeView[] = [];
  for (const link of links) {
    const fromIndex = indexById.get(link.fromRoomId);
    const toIndex = indexById.get(link.toRoomId);
    if (fromIndex === undefined || toIndex === undefined) continue;
    edges.push({ link, fromIndex, toIndex });
  }
  return edges.sort((a, b) => a.fromIndex - b.fromIndex);
}

export function SiteMapSchematic(props: {
  rooms: SiteMapRoom[];
  links: SiteLink[];
  mapLayout: SiteMapLayout;
  onLayoutChange?: (layout: SiteMapLayout) => void;
  onLinkLabelChange?: (linkId: string, label: string) => void;
  onLinkKindChange?: (linkId: string, kind: SiteLink["transitionKind"]) => void;
  readOnly?: boolean;
  /** Escena activa del motor (`space-…`). */
  highlightSceneId?: string;
}) {
  const { rooms, links, mapLayout } = props;
  if (rooms.length < 2) {
    return (
      <p className="muted sm" data-testid="escape-site-map-empty">
        Selecciona al menos dos habitaciones para ver el mapa.
      </p>
    );
  }

  const edges = layoutEdges(rooms, links);

  return (
    <div className="site-map-panel" data-testid="escape-site-map">
      <div className="site-map-toolbar row">
        <span className="muted sm">
          {props.readOnly ? "Mapa del recinto (solo lectura)" : "Mapa esquemático (topología, sin medidas)"}
        </span>
        {!props.readOnly && props.onLayoutChange && (
          <label className="site-map-layout-pick">
            Diseño
            <select
              value={mapLayout}
              onChange={(e) => props.onLayoutChange!(e.target.value as SiteMapLayout)}
              data-testid="escape-site-map-layout"
            >
              <option value="linear">Lineal (pasillo)</option>
              <option value="hub">Hub (desde la 1.ª habitación)</option>
            </select>
          </label>
        )}
      </div>

      <div
        className={
          mapLayout === "hub" ? "site-map-schematic site-map-schematic--hub" : "site-map-schematic site-map-schematic--linear"
        }
        role="img"
        aria-label="Mapa esquemático de habitaciones y pasajes"
      >
        {mapLayout === "linear" ? (
          <LinearMap
            rooms={rooms}
            edges={edges}
            readOnly={props.readOnly}
            highlightSceneId={props.highlightSceneId}
            onLinkLabelChange={props.onLinkLabelChange}
            onLinkKindChange={props.onLinkKindChange}
          />
        ) : (
          <HubMap
            rooms={rooms}
            edges={edges}
            readOnly={props.readOnly}
            highlightSceneId={props.highlightSceneId}
            onLinkLabelChange={props.onLinkLabelChange}
            onLinkKindChange={props.onLinkKindChange}
          />
        )}
      </div>
    </div>
  );
}

function RoomNode(props: {
  label: string;
  index: number;
  variant?: "hub";
  active?: boolean;
  isOutdoor?: boolean;
}) {
  return (
    <div
      className={`site-map-node${props.variant === "hub" ? " site-map-node--hub" : ""}${props.isOutdoor ? " site-map-node--outdoor" : ""}${props.active ? " site-map-node--active" : ""}`}
      title={props.label}
    >
      <span className="site-map-node-index">{props.index + 1}</span>
      <span className="site-map-node-label">{props.label}{props.isOutdoor ? " · ext." : ""}</span>
    </div>
  );
}

function LinkEdge(props: {
  link: SiteLink;
  onLinkLabelChange?: (linkId: string, label: string) => void;
  onLinkKindChange?: (linkId: string, kind: SiteLink["transitionKind"]) => void;
  vertical?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className={`site-map-edge${props.vertical ? " site-map-edge--vertical" : ""}`}>
      <span className="site-map-edge-arrow" aria-hidden>
        {props.vertical ? "↓" : "→"}
      </span>
      {props.readOnly ? (
        <span className="site-map-edge-static">{props.link.label}</span>
      ) : (
        <>
          <label className="site-map-edge-label">
            <input
              value={props.link.label}
              onChange={(e) => props.onLinkLabelChange?.(props.link.id, e.target.value)}
              placeholder="Pasaje"
            />
          </label>
          <select
            className="site-map-edge-kind"
            value={props.link.transitionKind}
            onChange={(e) => props.onLinkKindChange?.(props.link.id, e.target.value as SiteLink["transitionKind"])}
            title="Tipo de pasaje"
          >
            <option value="door">Puerta</option>
            <option value="stairs">Escalera</option>
            <option value="open">Abierto</option>
          </select>
        </>
      )}
    </div>
  );
}

function sceneActive(highlightSceneId: string | undefined, roomId: string, rooms: SiteMapRoom[]): boolean {
  if (!highlightSceneId) return false;
  const match = rooms.find((r) => r.id === roomId);
  if (match && highlightSceneId === `space-${roomId.slice(0, 8)}`) return true;
  return highlightSceneId.replace(/^space-/, "") === roomId.slice(0, 8);
}

function LinearMap(props: {
  rooms: SiteMapRoom[];
  edges: EdgeView[];
  readOnly?: boolean;
  highlightSceneId?: string;
  onLinkLabelChange?: (linkId: string, label: string) => void;
  onLinkKindChange?: (linkId: string, kind: SiteLink["transitionKind"]) => void;
}) {
  const linkByPair = new Map<string, SiteLink>();
  for (const e of props.edges) {
    linkByPair.set(`${e.fromIndex}-${e.toIndex}`, e.link);
  }

  return (
    <div className="site-map-linear">
      {props.rooms.map((room, i) => (
        <LinearSegment key={room.id}>
          <RoomNode
            label={room.label}
            index={i}
            isOutdoor={room.isOutdoor}
            active={sceneActive(props.highlightSceneId, room.id, props.rooms)}
          />
          {i < props.rooms.length - 1 && linkByPair.get(`${i}-${i + 1}`) ? (
            <LinkEdge
              link={linkByPair.get(`${i}-${i + 1}`)!}
              readOnly={props.readOnly}
              onLinkLabelChange={props.onLinkLabelChange}
              onLinkKindChange={props.onLinkKindChange}
            />
          ) : null}
        </LinearSegment>
      ))}
    </div>
  );
}

function LinearSegment(props: { children: ReactNode }) {
  return <div className="site-map-linear-segment">{props.children}</div>;
}

function HubMap(props: {
  rooms: SiteMapRoom[];
  edges: EdgeView[];
  readOnly?: boolean;
  highlightSceneId?: string;
  onLinkLabelChange?: (linkId: string, label: string) => void;
  onLinkKindChange?: (linkId: string, kind: SiteLink["transitionKind"]) => void;
}) {
  const hub = props.rooms[0];
  const satellites = props.rooms.slice(1);
  const linkByTo = new Map(
    props.edges.filter((e) => e.fromIndex === 0).map((e) => [e.toIndex, e.link]),
  );

  if (!hub) return null;

  return (
    <div className="site-map-hub">
      <RoomNode
        label={hub.label}
        index={0}
        variant="hub"
        isOutdoor={hub.isOutdoor}
        active={sceneActive(props.highlightSceneId, hub.id, props.rooms)}
      />
      <div className="site-map-hub-spokes">
        {satellites.map((room, si) => {
          const toIndex = si + 1;
          const link = linkByTo.get(toIndex);
          return (
            <div key={room.id} className="site-map-hub-spoke">
              {link ? (
                <LinkEdge
                  link={link}
                  vertical
                  readOnly={props.readOnly}
                  onLinkLabelChange={props.onLinkLabelChange}
                  onLinkKindChange={props.onLinkKindChange}
                />
              ) : (
                <span className="site-map-edge-arrow">↓</span>
              )}
              <RoomNode
                label={room.label}
                index={toIndex}
                isOutdoor={room.isOutdoor}
                active={sceneActive(props.highlightSceneId, room.id, props.rooms)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
