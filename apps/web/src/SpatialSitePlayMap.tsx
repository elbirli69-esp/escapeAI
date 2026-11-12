import type { SpatialSiteMapPublic } from "@escapeai/shared";
import { SiteMapSchematic } from "./scanner/SiteMapSchematic";

export function SpatialSitePlayMap(props: { map: SpatialSiteMapPublic }) {
  const rooms = props.map.rooms.map((r) => ({ id: r.inventoryId, label: r.label }));
  return (
    <aside className="site-spatial-play-map" data-testid="escape-site-play-map" aria-label="Mapa del recinto">
      <p className="site-spatial-banner sm">
        {props.map.currentSpatialSceneId && (
          <>
            Estás en: <strong>{props.map.rooms.find((r) => r.sceneId === props.map.currentSpatialSceneId)?.label}</strong>
            {" · "}
          </>
        )}
        Recinto: {props.map.siteName}
      </p>
      <SiteMapSchematic
        readOnly
        rooms={rooms}
        links={props.map.links}
        mapLayout={props.map.mapLayout}
        highlightSceneId={props.map.currentSpatialSceneId}
      />
    </aside>
  );
}
