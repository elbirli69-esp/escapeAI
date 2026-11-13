import { useEffect, useState } from "react";

/** No pinta la URL hasta que el navegador haya decodificado la imagen (evita flash de sustitución). */
export function useDecodedImageSrc(imageSrc?: string): string | undefined {
  const [visibleSrc, setVisibleSrc] = useState<string | undefined>();

  useEffect(() => {
    if (!imageSrc) {
      setVisibleSrc(undefined);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (!cancelled) setVisibleSrc(imageSrc);
    };
    img.onerror = () => {
      if (!cancelled) setVisibleSrc(undefined);
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  return visibleSrc;
}
