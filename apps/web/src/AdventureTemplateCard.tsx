import type { AdventureTemplateInfo } from "@escapeai/shared";
import { VisualCard } from "./VisualCard";

export function AdventureTemplateCard(props: {
  template: AdventureTemplateInfo;
  active: boolean;
  onSelect: () => void;
}) {
  const { template } = props;
  const cover = template.coverImage;

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
