import { useEffect, useState } from "react";

export function SceneHero(props: { image?: string; title: string; mood?: string }) {
  const [shown, setShown] = useState(props.image);
  const [incoming, setIncoming] = useState<string | undefined>();
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    const next = props.image;
    if (next === shown) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !shown || !next) {
      setShown(next);
      setIncoming(undefined);
      setFadeIn(false);
      return;
    }

    setIncoming(next);
    setFadeIn(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
    const done = window.setTimeout(() => {
      setShown(next);
      setIncoming(undefined);
      setFadeIn(false);
    }, 620);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [props.image, shown]);

  return (
    <figure className="scene-hero">
      <div className="scene-hero-stack" aria-hidden={!shown && !incoming}>
        {!shown && !incoming && <div className="scene-hero-placeholder" />}
        {shown && (
          <img
            src={shown}
            alt=""
            className={`scene-hero-img layer-base ${incoming ? "layer-dim" : ""}`}
            loading="eager"
            decoding="async"
          />
        )}
        {incoming && (
          <img
            src={incoming}
            alt=""
            className={`scene-hero-img layer-incoming ${fadeIn ? "layer-visible" : ""}`}
            decoding="async"
          />
        )}
      </div>
      <figcaption className="scene-hero-caption">
        <h2 className="scene-hero-title">{props.title}</h2>
        {props.mood && <p className="scene-hero-mood">{props.mood}</p>}
      </figcaption>
    </figure>
  );
}
