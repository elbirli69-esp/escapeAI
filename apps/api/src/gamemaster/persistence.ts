import type { NarrativeIntervention } from "@escapeai/shared";
import { Redis } from "@upstash/redis";
import { createUpstashRedis, sessionTtlSec } from "../redis-session-store.js";

const LIST_PREFIX = "escapeai:gm:list:";
const META_PREFIX = "escapeai:gm:meta:";

export type GmSessionMeta = {
  sequence: number;
  dedupeKeys: string[];
  llmCallCount: number;
  lastLlmCallMs: number;
  visitedSceneIds: string[];
  /** Puzzle en foco (último intento fallido o activo). */
  focusedPuzzleId?: string;
  /** Última acción con progreso real (resolver, mover, objeto…). */
  lastProgressMs: number;
  /** Puzzles que ya recibieron aviso TEAM_STUCK esta partida. */
  stuckNotifiedPuzzleIds: string[];
  characterTurnCount: number;
  lastCharacterTurnMs: number;
  /** Un aviso PACE_NUDGE por partida como máximo. */
  paceNudgeIssued: boolean;
};

const defaultMeta = (): GmSessionMeta => ({
  sequence: 0,
  dedupeKeys: [],
  llmCallCount: 0,
  lastLlmCallMs: 0,
  visitedSceneIds: [],
  lastProgressMs: Date.now(),
  stuckNotifiedPuzzleIds: [],
  characterTurnCount: 0,
  lastCharacterTurnMs: 0,
  paceNudgeIssued: false,
});

export interface GmInterventionStore {
  list(sessionId: string): Promise<NarrativeIntervention[]>;
  append(sessionId: string, item: NarrativeIntervention): Promise<void>;
  loadMeta(sessionId: string): Promise<GmSessionMeta>;
  saveMeta(sessionId: string, meta: GmSessionMeta): Promise<void>;
  tryDedupe(sessionId: string, key: string): Promise<boolean>;
  bumpSequence(sessionId: string): Promise<number>;
}

export class MemoryGmInterventionStore implements GmInterventionStore {
  private readonly lists = new Map<string, NarrativeIntervention[]>();
  private readonly meta = new Map<string, GmSessionMeta>();
  private readonly locks = new Map<string, Promise<void>>();

  private async withLock(sessionId: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.locks.get(sessionId) ?? Promise.resolve();
    let resolve!: () => void;
    const next = new Promise<void>((r) => {
      resolve = r;
    });
    this.locks.set(sessionId, prev.then(() => next));
    await prev;
    try {
      await fn();
    } finally {
      resolve();
    }
  }

  async list(sessionId: string): Promise<NarrativeIntervention[]> {
    return [...(this.lists.get(sessionId) ?? [])];
  }

  async append(sessionId: string, item: NarrativeIntervention): Promise<void> {
    await this.withLock(sessionId, async () => {
      const arr = this.lists.get(sessionId) ?? [];
      if (arr.some((x) => x.id === item.id)) return;
      arr.push(item);
      this.lists.set(sessionId, arr);
    });
  }

  async loadMeta(sessionId: string): Promise<GmSessionMeta> {
    return { ...(this.meta.get(sessionId) ?? defaultMeta()) };
  }

  async saveMeta(sessionId: string, meta: GmSessionMeta): Promise<void> {
    await this.withLock(sessionId, async () => {
      this.meta.set(sessionId, { ...meta });
    });
  }

  async tryDedupe(sessionId: string, key: string): Promise<boolean> {
    let accepted = false;
    await this.withLock(sessionId, async () => {
      const m = this.meta.get(sessionId) ?? defaultMeta();
      if (m.dedupeKeys.includes(key)) {
        accepted = false;
        return;
      }
      m.dedupeKeys = [...m.dedupeKeys, key];
      this.meta.set(sessionId, m);
      accepted = true;
    });
    return accepted;
  }

  async bumpSequence(sessionId: string): Promise<number> {
    let seq = 0;
    await this.withLock(sessionId, async () => {
      const m = this.meta.get(sessionId) ?? defaultMeta();
      seq = m.sequence + 1;
      m.sequence = seq;
      this.meta.set(sessionId, m);
    });
    return seq;
  }
}

class RedisGmInterventionStore implements GmInterventionStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSec: number,
  ) {}

  private listKey(sessionId: string): string {
    const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
    return `${LIST_PREFIX}${safe}`;
  }

  private metaKey(sessionId: string): string {
    const safe = sessionId.replace(/[^a-zA-Z0-9-]/g, "");
    return `${META_PREFIX}${safe}`;
  }

  async list(sessionId: string): Promise<NarrativeIntervention[]> {
    const raw = await this.redis.lrange<string>(this.listKey(sessionId), 0, -1);
    if (!raw?.length) return [];
    return raw
      .map((line) => {
        try {
          return JSON.parse(line) as NarrativeIntervention;
        } catch {
          return null;
        }
      })
      .filter((x): x is NarrativeIntervention => Boolean(x));
  }

  async append(sessionId: string, item: NarrativeIntervention): Promise<void> {
    const existing = await this.list(sessionId);
    if (existing.some((x) => x.id === item.id)) return;
    await this.redis.lpush(this.listKey(sessionId), JSON.stringify(item));
    await this.redis.expire(this.listKey(sessionId), this.ttlSec);
  }

  async loadMeta(sessionId: string): Promise<GmSessionMeta> {
    const raw = await this.redis.get<string | GmSessionMeta>(this.metaKey(sessionId));
    if (!raw) return defaultMeta();
    if (typeof raw === "string") {
      try {
        return { ...defaultMeta(), ...JSON.parse(raw) };
      } catch {
        return defaultMeta();
      }
    }
    return { ...defaultMeta(), ...raw };
  }

  async saveMeta(sessionId: string, meta: GmSessionMeta): Promise<void> {
    await this.redis.set(this.metaKey(sessionId), JSON.stringify(meta), { ex: this.ttlSec });
  }

  async tryDedupe(sessionId: string, key: string): Promise<boolean> {
    const meta = await this.loadMeta(sessionId);
    if (meta.dedupeKeys.includes(key)) return false;
    meta.dedupeKeys = [...meta.dedupeKeys, key];
    await this.saveMeta(sessionId, meta);
    return true;
  }

  async bumpSequence(sessionId: string): Promise<number> {
    const meta = await this.loadMeta(sessionId);
    meta.sequence += 1;
    await this.saveMeta(sessionId, meta);
    return meta.sequence;
  }
}

let lastGmStore: GmInterventionStore | null = null;

export function getGmInterventionStore(): GmInterventionStore | null {
  return lastGmStore;
}

export async function createGmInterventionStore(): Promise<GmInterventionStore> {
  const redis = createUpstashRedis();
  if (redis) {
    lastGmStore = new RedisGmInterventionStore(redis, sessionTtlSec());
    return lastGmStore;
  }
  lastGmStore = new MemoryGmInterventionStore();
  return lastGmStore;
}
