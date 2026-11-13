import { listLobbyHomeModes } from "@escapeai/escape-content";
import { Hono } from "hono";
import { resolveCoverImage } from "./pexels-search.js";

export function mountLobbyRoutes(app: Hono): void {
  app.get("/lobby/home", async (c) => {
    const modes = listLobbyHomeModes();
    const cards = await Promise.all(
      modes.map(async (m) => {
        const { coverImage, coverImageSource } = await resolveCoverImage({
          pexelsQuery: m.pexelsQuery,
          page: m.pexelsPage,
          localFallback: m.coverImage,
        });
        return {
          mode: m.mode,
          title: m.title,
          description: m.description,
          imageAlt: m.imageAlt,
          image: coverImage,
          coverImageSource,
        };
      }),
    );
    return c.json({ cards });
  });
}
