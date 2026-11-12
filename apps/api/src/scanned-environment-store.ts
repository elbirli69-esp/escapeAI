import type { SaveScannedEnvironmentRequest, ScannedEnvironment, ScannedEnvironmentSummary } from "@escapeai/shared";
import { sanitizeScannedEnvironmentInput, toScannedEnvironmentSummary } from "@escapeai/shared";
import { Redis } from "@upstash/redis";
import { randomUUID } from "node:crypto";
import { createUpstashRedis } from "./redis-session-store.js";

const SCANNED_KEY_PREFIX = "escapeai:scan:";
const SCANNED_INDEX_KEY = "escapeai:scan:index";

const DEFAULT_TTL_SEC = 7 * 24 * 60 * 60;

export interface ScannedEnvironmentStore {
  create(body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment>;
  update(id: string, body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment | undefined>;
  getById(id: string): Promise<ScannedEnvironment | undefined>;
  listSummaries(limit?: number): Promise<ScannedEnvironmentSummary[]>;
}

function ttlSec(): number {
  const raw = process.env.SCANNED_ENV_TTL_SEC;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 60) return Math.floor(n);
  }
  return DEFAULT_TTL_SEC;
}

function buildRecord(body: SaveScannedEnvironmentRequest, existing?: ScannedEnvironment): ScannedEnvironment {
  const now = new Date().toISOString();
  if (existing) {
    return {
      ...existing,
      name: body.name,
      environmentType: body.environmentType,
      objects: body.objects,
      constraints: body.constraints,
      scanMetadata: body.scanMetadata,
      updatedAt: now,
      version: existing.version + 1,
    };
  }
  return {
    id: body.id?.trim() || randomUUID(),
    name: body.name,
    environmentType: body.environmentType,
    objects: body.objects,
    constraints: body.constraints,
    scanMetadata: body.scanMetadata,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export class MemoryScannedEnvironmentStore implements ScannedEnvironmentStore {
  private readonly byId = new Map<string, ScannedEnvironment>();

  async create(body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment> {
    const record = buildRecord(body);
    this.byId.set(record.id, record);
    return record;
  }

  async update(id: string, body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment | undefined> {
    const existing = this.byId.get(id);
    if (!existing) return undefined;
    const record = buildRecord({ ...body, id }, existing);
    this.byId.set(id, record);
    return record;
  }

  async getById(id: string): Promise<ScannedEnvironment | undefined> {
    return this.byId.get(id);
  }

  async listSummaries(limit = 20): Promise<ScannedEnvironmentSummary[]> {
    const rows = [...this.byId.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
    return rows.map(toScannedEnvironmentSummary);
  }
}

class RedisScannedEnvironmentStore implements ScannedEnvironmentStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttl: number,
  ) {}

  private key(id: string): string {
    return `${SCANNED_KEY_PREFIX}${id}`;
  }

  async create(body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment> {
    const record = buildRecord(body);
    await this.redis.set(this.key(record.id), JSON.stringify(record), { ex: this.ttl });
    await this.redis.zadd(SCANNED_INDEX_KEY, { score: Date.now(), member: record.id });
    return record;
  }

  async update(id: string, body: SaveScannedEnvironmentRequest): Promise<ScannedEnvironment | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;
    const record = buildRecord({ ...body, id }, existing);
    await this.redis.set(this.key(id), JSON.stringify(record), { ex: this.ttl });
    await this.redis.zadd(SCANNED_INDEX_KEY, { score: Date.now(), member: id });
    return record;
  }

  async getById(id: string): Promise<ScannedEnvironment | undefined> {
    const raw = await this.redis.get<string | ScannedEnvironment>(this.key(id));
    if (!raw) return undefined;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }

  async listSummaries(limit = 20): Promise<ScannedEnvironmentSummary[]> {
    const ids = await this.redis.zrange<string[]>(SCANNED_INDEX_KEY, 0, limit - 1, { rev: true });
    if (!ids?.length) return [];
    const rows: ScannedEnvironment[] = [];
    for (const id of ids) {
      const row = await this.getById(id);
      if (row) rows.push(row);
    }
    return rows.map(toScannedEnvironmentSummary);
  }
}

export async function createScannedEnvironmentStore(): Promise<ScannedEnvironmentStore> {
  const redis = createUpstashRedis();
  if (redis) return new RedisScannedEnvironmentStore(redis, ttlSec());
  return new MemoryScannedEnvironmentStore();
}

export function parseAndSanitizeScanBody(raw: unknown) {
  return sanitizeScannedEnvironmentInput(raw);
}
