import { handle } from "hono/vercel";
import type { Hono } from "hono";
import { createApp } from "../apps/api/dist/app.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

let appPromise: Promise<Hono> | undefined;
let honoHandler: ReturnType<typeof handle> | undefined;

async function getHandler() {
  if (!honoHandler) {
    const app = await (appPromise ??= createApp());
    honoHandler = handle(app);
  }
  return honoHandler;
}

type RouteHandler = (req: Request) => Response | Promise<Response>;

const route: RouteHandler = (req) => getHandler().then((h) => h(req));

export const GET = route;
export const POST = route;
export const PUT = route;
export const PATCH = route;
export const DELETE = route;
export const OPTIONS = route;
export const HEAD = route;
