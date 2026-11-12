type VisualCardProps = {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  eyebrow?: string;
  meta?: string;
  active?: boolean;
  layout?: "stack" | "row";
  className?: string;
  onClick?: () => void;
  type?: "button" | "article";
};

export function VisualCard(props: VisualCardProps) {
  const {
    title,
    description,
    imageSrc,
    imageAlt,
    eyebrow,
    meta,
    active,
    layout = "stack",
    className = "",
    onClick,
    type = "button",
  } = props;

  const cardClass = [
    "room-card-v2",
    layout === "stack" ? "layout-stack" : "",
    active ? "active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const media = (
    <div className="room-card-media">
      {imageSrc ? (
        <img src={imageSrc} alt={imageAlt ?? ""} loading="lazy" decoding="async" />
      ) : (
        <div className="room-card-fallback" aria-hidden />
      )}
    </div>
  );

  const copy = (
    <div className="room-card-copy">
      {eyebrow && <span className="card-eyebrow">{eyebrow}</span>}
      <strong>{title}</strong>
      {description && <span className="room-tagline">{description}</span>}
      {meta && <span className="meta card-meta">{meta}</span>}
    </div>
  );

  if (type === "article") {
    return (
      <article className={cardClass}>
        {media}
        {copy}
      </article>
    );
  }

  return (
    <button type="button" className={cardClass} onClick={onClick}>
      {media}
      {copy}
    </button>
  );
}

export function formatRoomDuration(sec: number): string {
  const min = Math.round(sec / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h` : `${min} min`;
}
