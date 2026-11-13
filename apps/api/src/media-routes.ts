import { Hono } from "hono";
import { pickPexelsFallback, searchPexelsImage } from "./pexels-search.js";

export function mountMediaRoutes(app: Hono): void {
  app.get("/media/pexels", async (c) => {
    const q = (c.req.query("q") ?? "mystery").trim();
    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    const result = await searchPexelsImage(q, page);
    return c.json({ url: result.url, source: result.source, query: q });
  });

  app.post("/media/fal-image", async (c) => {
    const body = (await c.req.json<{ prompt?: string }>().catch(() => ({}))) as { prompt?: string };
    const prompt = body.prompt?.trim() || "mysterious escape room clue";
    const key = process.env.FAL_KEY?.trim();

    if (!key) {
      return c.json({
        url: pickPexelsFallback(prompt),
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
      return c.json({ url: pickPexelsFallback(prompt), source: "fallback", prompt });
    }
  });
}
