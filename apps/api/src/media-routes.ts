import { Hono } from "hono";

type PexelsPhotoResponse = {
  photos: Array<{ src: { large2x?: string; large?: string; medium?: string } }>;
};

const FALLBACK_IMAGES: Record<string, string> = {
  mystery: "/media/lighthouse-cover.jpg",
  lighthouse: "/media/lighthouse-cover.jpg",
  fog: "/media/lighthouse-dock.jpg",
  party: "/media/lighthouse-dock.jpg",
  birthday: "/media/pilot-entrance.jpg",
  candles: "/media/pilot-entrance.jpg",
  team: "/media/pilot-control.jpg",
  competition: "/media/pilot-control.jpg",
  celebration: "/media/lighthouse-dock.jpg",
  friends: "/media/lighthouse-dock.jpg",
  lock: "/media/pilot-entrance.jpg",
  default: "/media/pilot-cover.jpg",
};

export function mountMediaRoutes(app: Hono): void {
  app.get("/media/pexels", async (c) => {
    const q = (c.req.query("q") ?? "mystery").trim();
    const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) {
      return c.json({
        url: pickFallback(q),
        source: "fallback",
        query: q,
      });
    }

    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?per_page=1&query=${encodeURIComponent(q)}`,
        { headers: { Authorization: key } },
      );
      if (!res.ok) throw new Error(`Pexels ${res.status}`);
      const data = (await res.json()) as PexelsPhotoResponse;
      const photo = data.photos[0];
      const url = photo?.src.large2x ?? photo?.src.large ?? photo?.src.medium;
      if (!url) throw new Error("Sin resultados");
      return c.json({ url, source: "pexels", query: q });
    } catch (err) {
      console.warn("Pexels failed:", err);
      return c.json({ url: pickFallback(q), source: "fallback", query: q });
    }
  });

  app.post("/media/fal-image", async (c) => {
    const body = (await c.req.json<{ prompt?: string }>().catch(() => ({}))) as { prompt?: string };
    const prompt = body.prompt?.trim() || "mysterious escape room clue";
    const key = process.env.FAL_KEY?.trim();

    if (!key) {
      return c.json({
        url: pickFallback(prompt),
        source: "fallback",
        prompt,
      });
    }

    try {
      const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: "landscape_16_9",
          num_images: 1,
        }),
      });
      if (!res.ok) throw new Error(`fal ${res.status}`);
      const data = (await res.json()) as { images?: Array<{ url: string }> };
      const url = data.images?.[0]?.url;
      if (!url) throw new Error("fal sin imagen");
      return c.json({ url, source: "fal", prompt });
    } catch (err) {
      console.warn("fal failed:", err);
      return c.json({ url: pickFallback(prompt), source: "fallback", prompt });
    }
  });
}

function pickFallback(query: string): string {
  const lower = query.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return FALLBACK_IMAGES.default;
}
