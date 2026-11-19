import { useDecodedImageSrc } from "./useDecodedImageSrc";

type VisualCardProps = {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  eyebrow?: string;
  meta?: string;
  active?: boolean;
  layout?: "stack" | "row";
  /** Menos texto y foto más baja (plantillas, catálogo). */
  variant?: "default" | "compact";
  /** Carga prioritaria en tarjetas above-the-fold del lobby. */
  imagePriority?: boolean;
  /** Accesibilidad: si se omite, se usa título + descripción. */
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "article";
  "data-testid"?: string;
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
    variant = "default",
    imagePriority = false,
    ariaLabel,
    className = "",
    onClick,
    type = "button",
    "data-testid": dataTestId,
  } = props;

  const cardClass = [
    "room-card-v2",
    layout === "stack" ? "layout-stack" : "",
    variant === "compact" ? "compact" : "",
    active ? "active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const visibleSrc = useDecodedImageSrc(imageSrc);
  const showFallback = !visibleSrc;
  const accessibleLabel = ariaLabel ?? `${title}. ${description}`.trim();

  const media = (
    <div className="room-card-media">
      {showFallback && <div className="room-card-fallback" aria-hidden />}
      {visibleSrc ? (
        <>
          <img
            src={visibleSrc}
            alt={imageAlt ?? ""}
            className="room-card-img-ready"
            loading={imagePriority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={imagePriority ? "high" : "auto"}
          />
          <span className="room-card-media-scrim" aria-hidden />
        </>
      ) : null}
    </div>
  );

  const copy = (
    <div className="room-card-copy">
      {eyebrow && <span className="card-eyebrow">{eyebrow}</span>}
      <strong>{title}</strong>
      {description && (
        <span className={variant === "compact" ? "room-tagline room-tagline-compact" : "room-tagline"}>
          {description}
        </span>
      )}
      {meta && <span className="meta card-meta">{meta}</span>}
    </div>
  );

  if (type === "article") {
    return (
      <article className={cardClass} aria-label={accessibleLabel}>
        {media}
        {copy}
      </article>
    );
  }

  return (
    <button
      type="button"
      className={cardClass}
      onClick={onClick}
      data-testid={dataTestId}
      aria-label={accessibleLabel}
    >
      {media}
      {copy}
    </button>
  );
}

export function formatRoomDuration(sec: number): string {
  const min = Math.round(sec / 60);
  return min >= 60 ? `${Math.floor(min / 60)} h` : `${min} min`;
}
