import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import {
  deserializeSession,
  serializeSession,
  type SessionRecord,
} from "@escapeai/escape-engine";
import {
  createUpstashRedis,
  RedisSessionStore,
  sessionTtlSec,
} from "./redis-session-store.js";

export type SessionStoreKind = "redis" | "file" | "memory";

export interface SessionStoreMeta {
  kind: SessionStoreKind;
  ttlSec?: number;
}

export interface SessionStore {
  get(sessionId: string): Promise<SessionRecord | undefined>;
  set(session: SessionRecord): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

let lastMeta: SessionStoreMeta = { kind: "memory" };

export function getSessionStoreMeta(): SessionStoreMeta {
  return lastMeta;
}

export class MemorySessionStore implements SessionStore {
  private readonly map = new Map<string, SessionRecord>();

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    return this.map.get(sessionId);
  }

  async set(session: SessionRecord): Promise<void> {
    this.map.set(session.sessionId, session);
  }

  async delete(sessionId: string): Promise<void> {
    this.map.delete(sessionId);
  }
}

export class FileSessionStore implements SessionStore {
  constructor(private readonly directory: string) {}

  async init(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
  }

  private path(sessionId: string): string {
    const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
    return join(this.directory, `${safe}.json`);
  }

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    try {
      const raw = await readFile(this.path(sessionId), "utf8");
      return deserializeSession(JSON.parse(raw));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw err;
    }
  }

  async set(session: SessionRecord): Promise<void> {
    await writeFile(
      this.path(session.sessionId),
      JSON.stringify(serializeSession(session), null, 0),
      "utf8",
    );
  }

  async delete(sessionId: string): Promise<void> {
    try {
      await unlink(this.path(sessionId));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  async listIds(): Promise<string[]> {
    const files = await readdir(this.directory);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  }
}

export async function createSessionStore(): Promise<SessionStore> {
  const redis = createUpstashRedis();
  if (redis) {
    const ttlSec = sessionTtlSec();
    lastMeta = { kind: "redis", ttlSec };
    return new RedisSessionStore(redis, ttlSec);
  }

  const dataDir =
    process.env.SESSION_DATA_DIR ??
    (process.env.VERCEL ? "/tmp/escapeai-sessions" : undefined);
  if (dataDir) {
    const store = new FileSessionStore(dataDir);
    await store.init();
    lastMeta = { kind: "file" };
    return store;
  }

  lastMeta = { kind: "memory" };
  return new MemorySessionStore();
}
