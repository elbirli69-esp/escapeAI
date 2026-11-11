import { randomBytes, randomUUID } from "node:crypto";
import type { RoomDefinition } from "@escapeai/escape-engine";
import type { CreateEventRequest, EventPlayerPublic, EventPreview } from "@escapeai/shared";
import { Redis } from "@upstash/redis";
import { createUpstashRedis, sessionTtlSec } from "./redis-session-store.js";

const EVENT_KEY_PREFIX = "escapeai:event:";

export type StoredPlayer = {
  playerId: string;
  displayName: string;
  slot: number;
  sessionId?: string;
  status: EventPlayerPublic["status"];
  joinedAtMs: number;
  timeRemainingSec?: number;
};

export type StoredEvent = {
  eventId: string;
  joinCode: string;
  createdAtMs: number;
  config: CreateEventRequest;
  title: string;
  room: RoomDefinition;
  players: Record<string, StoredPlayer>;
};

export interface EventStore {
  create(event: StoredEvent): Promise<void>;
  getByCode(joinCode: string): Promise<StoredEvent | undefined>;
  save(event: StoredEvent): Promise<void>;
}

export function createJoinCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function toEventPreview(event: StoredEvent): EventPreview {
  return {
    joinCode: event.joinCode,
    eventId: event.eventId,
    title: event.title,
    adventureType: event.config.adventureType,
    playerCount: event.config.playerCount,
    roomName: event.room.name,
    timeLimitSec: event.room.timeLimitSec,
    sceneCount: Object.keys(event.room.scenes).length,
    joinedPlayers: Object.keys(event.players).length,
  };
}

export function validateCreateEvent(body: CreateEventRequest): string | undefined {
  if (!body.adventureType || !["birthday", "celebration", "mystery", "team"].includes(body.adventureType)) {
    return "Tipo de aventura no válido.";
  }
  const count = Number(body.playerCount);
  if (!Number.isFinite(count) || count < 1 || count > 20) {
    return "El número de jugadores debe estar entre 1 y 20.";
  }
  const name = body.subject?.name?.trim();
  if (!name || name.length < 2) {
    return "Indica el nombre del protagonista.";
  }
  const facts = body.facts?.map((f) => f.trim()).filter(Boolean) ?? [];
  if (facts.length < 1) {
    return "Añade al menos un dato jugable (anécdota, lugar, etc.).";
  }
  body.facts = facts;
  body.playerCount = Math.floor(count);
  body.subject = {
    name,
    age: body.subject.age,
    nickname: body.subject.nickname?.trim() || undefined,
  };
  return undefined;
}

export function newStoredEvent(
  config: CreateEventRequest,
  room: RoomDefinition,
  title: string,
): StoredEvent {
  return {
    eventId: randomUUID(),
    joinCode: createJoinCode(),
    createdAtMs: Date.now(),
    config,
    title,
    room,
    players: {},
  };
}

class MemoryEventStore implements EventStore {
  private readonly byCode = new Map<string, StoredEvent>();

  async create(event: StoredEvent): Promise<void> {
    if (this.byCode.has(event.joinCode)) throw new Error("join code collision");
    this.byCode.set(event.joinCode, event);
  }

  async getByCode(joinCode: string): Promise<StoredEvent | undefined> {
    return this.byCode.get(joinCode.toUpperCase());
  }

  async save(event: StoredEvent): Promise<void> {
    this.byCode.set(event.joinCode, event);
  }
}

class RedisEventStore implements EventStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSec: number,
  ) {}

  private key(joinCode: string): string {
    return `${EVENT_KEY_PREFIX}${joinCode.toUpperCase()}`;
  }

  async create(event: StoredEvent): Promise<void> {
    const k = this.key(event.joinCode);
    const exists = await this.redis.exists(k);
    if (exists) throw new Error("join code collision");
    await this.redis.set(k, JSON.stringify(event), { ex: this.ttlSec });
  }

  async getByCode(joinCode: string): Promise<StoredEvent | undefined> {
    const raw = await this.redis.get<string>(this.key(joinCode));
    if (!raw) return undefined;
    return JSON.parse(raw) as StoredEvent;
  }

  async save(event: StoredEvent): Promise<void> {
    await this.redis.set(this.key(event.joinCode), JSON.stringify(event), { ex: this.ttlSec });
  }
}

export async function createEventStore(): Promise<EventStore> {
  const redis = createUpstashRedis();
  if (redis) return new RedisEventStore(redis, sessionTtlSec());
  return new MemoryEventStore();
}

export function nextPlayerSlot(event: StoredEvent): number | undefined {
  const used = new Set(Object.values(event.players).map((p) => p.slot));
  for (let slot = 1; slot <= event.config.playerCount; slot++) {
    if (!used.has(slot)) return slot;
  }
  return undefined;
}

export function leaderboardFromEvent(event: StoredEvent): EventPlayerPublic[] {
  return Object.values(event.players)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      slot: p.slot,
      status: p.status,
      timeRemainingSec: p.timeRemainingSec,
    }));
}
