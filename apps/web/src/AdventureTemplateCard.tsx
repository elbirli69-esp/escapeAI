import type { AdventureTemplateInfo } from "@escapeai/shared";
import { useEffect, useState } from "react";
import { fetchPexelsImage } from "./api";
import { VisualCard } from "./VisualCard";

export function AdventureTemplateCard(props: {
  template: AdventureTemplateInfo;
  active: boolean;
  onSelect: () => void;
}) {
  const { template } = props;
  const fallback = template.coverImage ?? "/media/pilot-cover.jpg";
  const [cover, setCover] = useState(fallback);

  useEffect(() => {
    setCover(fallback);
    if (!template.pexelsQuery) return;
    let cancelled = false;
    void fetchPexelsImage(template.pexelsQuery).then((res) => {
      if (cancelled || !res.url) return;
      setCover(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [template.id, template.pexelsQuery, fallback]);

  return (
    <VisualCard
      title={template.title}
      description={template.tagline ?? template.description}
      imageSrc={cover}
      imageAlt={`Plantilla: ${template.title}`}
      active={props.active}
      layout="stack"
      variant="compact"
      onClick={props.onSelect}
    />
  );
}
