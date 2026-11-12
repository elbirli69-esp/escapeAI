import type { SaveScannedSiteRequest, ScannedSite, ScannedSiteSummary } from "@escapeai/shared";
import { sanitizeScannedSiteInput, toScannedSiteSummary } from "@escapeai/shared";
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import { createUpstashRedis } from "./redis-session-store.js";

const SITE_KEY_PREFIX = "escapeai:site:";
const SITE_INDEX_KEY = "escapeai:site:index";
const DEFAULT_TTL_SEC = 7 * 24 * 60 * 60;

export interface ScannedSiteStore {
  create(body: SaveScannedSiteRequest): Promise<ScannedSite>;
  update(id: string, body: SaveScannedSiteRequest): Promise<ScannedSite | undefined>;
  getById(id: string): Promise<ScannedSite | undefined>;
  listSummaries(limit?: number): Promise<ScannedSiteSummary[]>;
}

function ttlSec(): number {
  const raw = process.env.SCANNED_ENV_TTL_SEC;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 60) return Math.floor(n);
  }
  return DEFAULT_TTL_SEC;
}

function buildRecord(body: SaveScannedSiteRequest, existing?: ScannedSite): ScannedSite {
  const now = new Date().toISOString();
  if (existing) {
    return {
      ...existing,
      name: body.name,
      roomIds: body.roomIds,
      links: body.links,
      mapLayout: body.mapLayout,
      geoContext: body.geoContext,
      outdoorRoomId: body.outdoorRoomId,
      updatedAt: now,
      version: existing.version + 1,
    };
  }
  return {
    id: body.id?.trim() || randomUUID(),
    name: body.name,
    roomIds: body.roomIds,
    links: body.links,
    mapLayout: body.mapLayout,
    geoContext: body.geoContext,
    outdoorRoomId: body.outdoorRoomId,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export class MemoryScannedSiteStore implements ScannedSiteStore {
  private readonly byId = new Map<string, ScannedSite>();

  async create(body: SaveScannedSiteRequest): Promise<ScannedSite> {
    const record = buildRecord(body);
    this.byId.set(record.id, record);
    return record;
  }

  async update(id: string, body: SaveScannedSiteRequest): Promise<ScannedSite | undefined> {
    const existing = this.byId.get(id);
    if (!existing) return undefined;
    const record = buildRecord({ ...body, id }, existing);
    this.byId.set(id, record);
    return record;
  }

  async getById(id: string): Promise<ScannedSite | undefined> {
    return this.byId.get(id);
  }

  async listSummaries(limit = 20): Promise<ScannedSiteSummary[]> {
    const rows = [...this.byId.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
    return rows.map(toScannedSiteSummary);
  }
}

class RedisScannedSiteStore implements ScannedSiteStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttl: number,
  ) {}

  private key(id: string): string {
    return `${SITE_KEY_PREFIX}${id}`;
  }

  async create(body: SaveScannedSiteRequest): Promise<ScannedSite> {
    const record = buildRecord(body);
    await this.redis.set(this.key(record.id), JSON.stringify(record), { ex: this.ttl });
    await this.redis.zadd(SITE_INDEX_KEY, { score: Date.now(), member: record.id });
    return record;
  }

  async update(id: string, body: SaveScannedSiteRequest): Promise<ScannedSite | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;
    const record = buildRecord({ ...body, id }, existing);
    await this.redis.set(this.key(id), JSON.stringify(record), { ex: this.ttl });
    await this.redis.zadd(SITE_INDEX_KEY, { score: Date.now(), member: id });
    return record;
  }

  async getById(id: string): Promise<ScannedSite | undefined> {
    const raw = await this.redis.get<string | ScannedSite>(this.key(id));
    if (!raw) return undefined;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  async listSummaries(limit = 20): Promise<ScannedSiteSummary[]> {
    const ids = await this.redis.zrange<string[]>(SITE_INDEX_KEY, 0, limit - 1, { rev: true });
    if (!ids?.length) return [];
    const rows: ScannedSite[] = [];
    for (const id of ids) {
      const row = await this.getById(id);
      if (row) rows.push(row);
    }
    return rows.map(toScannedSiteSummary);
  }
}

export async function createScannedSiteStore(): Promise<ScannedSiteStore> {
  const redis = createUpstashRedis();
  if (redis) return new RedisScannedSiteStore(redis, ttlSec());
  return new MemoryScannedSiteStore();
}

export function parseAndSanitizeSiteBody(raw: unknown) {
  return sanitizeScannedSiteInput(raw);
}
