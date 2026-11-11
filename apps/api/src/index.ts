import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);

async function main() {
  const app = await createApp();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`escapeAI API listening on http://localhost:${port}/api`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
