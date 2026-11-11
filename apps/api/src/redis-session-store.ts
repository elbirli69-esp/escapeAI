import { Redis } from "@upstash/redis";
import {
  deserializeSession,
  serializeSession,
  type SerializedSession,
  type SessionRecord,
} from "@escapeai/escape-engine";
import type { SessionStore } from "./session-store.js";

const KEY_PREFIX = "escapeai:session:";

export class RedisSessionStore implements SessionStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSec: number,
  ) {}

  private key(sessionId: string): string {
    const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
    return `${KEY_PREFIX}${safe}`;
  }

  async get(sessionId: string): Promise<SessionRecord | undefined> {
    const raw = await this.redis.get<string | SerializedSession>(this.key(sessionId));
    if (!raw) return undefined;
    const data: SerializedSession =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    return deserializeSession(data);
  }

  async set(session: SessionRecord): Promise<void> {
    const payload = JSON.stringify(serializeSession(session));
    await this.redis.set(this.key(session.sessionId), payload, { ex: this.ttlSec });
  }

  async delete(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}

export function createUpstashRedis(): Redis | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return new Redis({ url, token });
}

export function sessionTtlSec(): number {
  const raw = process.env.SESSION_TTL_SEC;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 60 * 60 * 48;
}
