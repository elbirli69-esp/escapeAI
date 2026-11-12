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
      {props.map.suggestedVisit.length > 0 && (
        <ol className="site-suggested-route" data-testid="escape-site-suggested-route">
          {props.map.suggestedVisit.map((step) => {
            const active = props.map.currentVisitOrder === step.order;
            return (
              <li key={step.sceneId} className={active ? "site-route-step site-route-step--active" : "site-route-step"}>
                <span className="site-route-num">{step.order}.</span> {step.label}
                {active ? " · estás aquí" : ""}
              </li>
            );
          })}
        </ol>
      )}
      <p className="muted sm privacy">La ruta es orientativa: el motor avanza por escenas y pasajes confirmados (QR/código), no por GPS interior.</p>
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
