import type { AdventureType } from "@escapeai/shared";

const LOCAL_FALLBACK: Record<string, string> = {
  mystery: "/media/lighthouse-cover.jpg",
  lighthouse: "/media/lighthouse-cover.jpg",
  fog: "/media/lighthouse-dock.jpg",
  party: "/media/lighthouse-dock.jpg",
  birthday: "/media/pilot-entrance.jpg",
  candles: "/media/pilot-entrance.jpg",
  team: "/media/pilot-control.jpg",
  celebration: "/media/lighthouse-dock.jpg",
  friends: "/media/lighthouse-dock.jpg",
  default: "/media/pilot-cover.jpg",
};

const PEXELS_PAGE: Record<AdventureType, number> = {
  celebration: 1,
  birthday: 2,
  mystery: 1,
  team: 3,
};

export function pickPexelsFallback(query: string): string {
  const lower = query.toLowerCase();
  for (const [key, url] of Object.entries(LOCAL_FALLBACK)) {
    if (lower.includes(key)) return url;
  }
  return LOCAL_FALLBACK.default;
}

export async function searchPexelsImage(
  query: string,
  page = 1,
): Promise<{ url: string; source: "pexels" | "fallback" }> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) {
    return { url: pickPexelsFallback(query), source: "fallback" };
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?per_page=1&page=${page}&orientation=landscape&query=${encodeURIComponent(query)}`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) throw new Error(`Pexels ${res.status}`);
    const data = (await res.json()) as {
      photos: Array<{ src: { large2x?: string; large?: string; medium?: string } }>;
    };
    const photo = data.photos[0];
    const url = photo?.src.large2x ?? photo?.src.large ?? photo?.src.medium;
    if (!url) throw new Error("Sin resultados");
    return { url, source: "pexels" };
  } catch (err) {
    console.warn("Pexels failed:", err);
    return { url: pickPexelsFallback(query), source: "fallback" };
  }
}

export function pexelsPageForAdventure(id: AdventureType): number {
  return PEXELS_PAGE[id] ?? 1;
}

export async function resolveCoverImage(opts: {
  pexelsQuery: string;
  page?: number;
  localFallback: string;
}): Promise<{ coverImage: string; coverImageSource: "pexels" | "fallback" }> {
  const { url, source } = await searchPexelsImage(opts.pexelsQuery, opts.page ?? 1);
  return {
    coverImage: source === "pexels" ? url : opts.localFallback,
    coverImageSource: source,
  };
}
