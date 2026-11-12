import type { ScannedEnvironment, ScannedSite, SiteLink } from "@escapeai/shared";
import type { RoomDefinition } from "@escapeai/escape-engine";

export function sceneIdForInventoryRoom(inventoryId: string): string {
  return `space-${inventoryId.slice(0, 8)}`;
}

export function findSiteLink(site: ScannedSite, fromId: string, toId: string): SiteLink | undefined {
  return (
    site.links.find((l) => l.fromRoomId === fromId && l.toRoomId === toId) ??
    site.links.find((l) => l.fromRoomId === toId && l.toRoomId === fromId)
  );
}

export function bridgePuzzleIdForLink(link: SiteLink): string {
  return `site_passage_${link.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
}

type Exit = NonNullable<RoomDefinition["scenes"][string]["exits"]>[number];

export function buildInteriorExits(
  site: ScannedSite,
  ordered: ScannedEnvironment[],
  roomIndex: number,
  gatePuzzleId: string,
): Exit[] {
  const env = ordered[roomIndex]!;
  const exits: Exit[] = [];

  if (site.mapLayout === "hub") {
    const hub = ordered[0]!;
    if (roomIndex === 0) {
      for (let j = 1; j < ordered.length; j++) {
        const target = ordered[j]!;
        const link = findSiteLink(site, hub.id, target.id);
        if (!link) continue;
        const bridgeId = bridgePuzzleIdForLink(link);
        exits.push({
          toSceneId: sceneIdForInventoryRoom(target.id),
          label: link.label,
          when: { type: "puzzle_solved", puzzleId: bridgeId },
        });
      }
    } else {
      const link = findSiteLink(site, hub.id, env.id);
      const bridgeId = link ? bridgePuzzleIdForLink(link) : gatePuzzleId;
      exits.push({
        toSceneId: sceneIdForInventoryRoom(hub.id),
        label: `Volver a ${hub.name}`,
        when: { type: "puzzle_solved", puzzleId: bridgeId },
      });
    }
    return exits;
  }

  if (roomIndex < ordered.length - 1) {
    const next = ordered[roomIndex + 1]!;
    const link = findSiteLink(site, env.id, next.id);
    exits.push({
      toSceneId: sceneIdForInventoryRoom(next.id),
      label: link?.label ?? "Siguiente habitación",
      when: { type: "puzzle_solved", puzzleId: gatePuzzleId },
    });
  }

  return exits;
}
