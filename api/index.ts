import { handle } from "hono/vercel";
import { createApp } from "../apps/api/dist/app.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const app = await createApp();

export default handle(app);
