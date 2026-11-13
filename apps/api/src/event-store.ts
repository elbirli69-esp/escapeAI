import { randomBytes } from "node:crypto";
import type { RoomDefinition } from "@escapeai/escape-engine";
import type {
  CreateEventRequest,
  EventPreview,
  EventTeamPublic,
} from "@escapeai/shared";
import { MAX_EVENT_TEAMS, MIN_EVENT_TEAMS, resolveTeamCount } from "@escapeai/shared";
import { Redis } from "@upstash/redis";
import { createUpstashRedis, sessionTtlSec } from "./redis-session-store.js";

const EVENT_KEY_PREFIX = "escapeai:event:";

export type StoredTeam = {
  teamId: string;
  teamName: string;
  slot: number;
  sessionId?: string;
  status: EventTeamPublic["status"];
  joinedAtMs: number;
  timeRemainingSec?: number;
  elapsedSec?: number;
  puzzlesSolved?: number;
  currentSceneId?: string;
  currentSceneTitle?: string;
};

export type StoredEvent = {
  eventId: string;
  joinCode: string;
  createdAtMs: number;
  config: CreateEventRequest;
  title: string;
  room: RoomDefinition;
  teams: Record<string, StoredTeam>;
  /** @deprecated Lectura legacy */
  players?: Record<string, StoredTeam & { playerId?: string; displayName?: string }>;
};

export interface EventStore {
  create(event: StoredEvent): Promise<void>;
  getByCode(joinCode: string): Promise<StoredEvent | undefined>;
  save(event: StoredEvent): Promise<void>;
}

export function createJoinCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function migrateLegacyEvent(event: StoredEvent): StoredEvent {
  if (Object.keys(event.teams ?? {}).length > 0) return event;
  const legacy = event.players ?? {};
  const teams: Record<string, StoredTeam> = {};
  for (const [id, row] of Object.entries(legacy)) {
    teams[id] = {
      teamId: row.teamId ?? id,
      teamName: row.teamName ?? row.displayName ?? "Equipo",
      slot: row.slot,
      sessionId: row.sessionId,
      status: row.status,
      joinedAtMs: row.joinedAtMs,
      timeRemainingSec: row.timeRemainingSec,
      elapsedSec: row.elapsedSec,
      puzzlesSolved: row.puzzlesSolved,
      currentSceneId: row.currentSceneId,
      currentSceneTitle: row.currentSceneTitle,
    };
  }
  return { ...event, teams };
}

export function toEventPreview(event: StoredEvent): EventPreview {
  const e = migrateLegacyEvent(event);
  const teamCount = resolveTeamCount(e.config);
  return {
    joinCode: e.joinCode,
    eventId: e.eventId,
    title: e.title,
    adventureType: e.config.adventureType,
    teamCount,
    roomName: e.room.name,
    timeLimitSec: e.room.timeLimitSec,
    sceneCount: Object.keys(e.room.scenes).length,
    joinedTeams: Object.keys(e.teams).length,
    coverImage: e.room.coverImage,
    theme: e.room.theme,
  };
}

export function validateCreateEvent(body: CreateEventRequest): string | undefined {
  if (!body.adventureType || !["birthday", "celebration", "mystery", "team"].includes(body.adventureType)) {
    return "Tipo de aventura no válido.";
  }
  const teamCount = resolveTeamCount(body);
  if (teamCount < MIN_EVENT_TEAMS || teamCount > MAX_EVENT_TEAMS) {
    return `El número de equipos debe estar entre ${MIN_EVENT_TEAMS} y ${MAX_EVENT_TEAMS}.`;
  }
  body.teamCount = teamCount;
  if (body.durationMin && ![30, 45, 60].includes(body.durationMin)) {
    body.durationMin = 45;
  }
  const name = body.subject?.name?.trim();
  if (!name || name.length < 2) {
    return "Indica el nombre central (persona, evento o tema).";
  }
  const facts = body.facts?.map((f) => f.trim()).filter(Boolean) ?? [];
  if (facts.length < 1) {
    return "Añade al menos un dato jugable (anécdota, lugar, etc.).";
  }
  body.facts = facts;
  body.subject = {
    name,
    age: body.subject.age,
    nickname: body.subject.nickname?.trim() || undefined,
  };
  return undefined;
}

export function nextTeamSlot(event: StoredEvent): number | undefined {
  const e = migrateLegacyEvent(event);
  const cap = resolveTeamCount(e.config);
  const used = new Set(Object.values(e.teams).map((t) => t.slot));
  for (let slot = 1; slot <= cap; slot++) {
    if (!used.has(slot)) return slot;
  }
  return undefined;
}

function rankTeams(teams: EventTeamPublic[]): EventTeamPublic[] {
  const order = { won: 0, playing: 1, waiting: 2, lost: 3 } as const;
  return [...teams].sort((a, b) => {
    const sa = order[a.status];
    const sb = order[b.status];
    if (sa !== sb) return sa - sb;
    if (a.status === "won" && b.status === "won") {
      return (a.elapsedSec ?? 99999) - (b.elapsedSec ?? 99999);
    }
    if (a.status === "playing" && b.status === "playing") {
      return (b.puzzlesSolved ?? 0) - (a.puzzlesSolved ?? 0);
    }
    return a.slot - b.slot;
  });
}

export function leaderboardFromEvent(event: StoredEvent): EventTeamPublic[] {
  const e = migrateLegacyEvent(event);
  const rows: EventTeamPublic[] = Object.values(e.teams).map((t) => ({
    teamId: t.teamId,
    teamName: t.teamName,
    slot: t.slot,
    status: t.status,
    timeRemainingSec: t.timeRemainingSec,
    elapsedSec: t.elapsedSec,
    puzzlesSolved: t.puzzlesSolved,
    currentSceneId: t.currentSceneId,
    currentSceneTitle: t.currentSceneTitle,
  }));
  return rankTeams(rows);
}

export class MemoryEventStore implements EventStore {
  private readonly byCode = new Map<string, StoredEvent>();

  async create(event: StoredEvent): Promise<void> {
    if (this.byCode.has(event.joinCode)) throw new Error("join code collision");
    this.byCode.set(event.joinCode, event);
  }

  async getByCode(joinCode: string): Promise<StoredEvent | undefined> {
    const raw = this.byCode.get(joinCode.toUpperCase());
    return raw ? migrateLegacyEvent(raw) : undefined;
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
    const raw = await this.redis.get<string | StoredEvent>(this.key(joinCode));
    if (!raw) return undefined;
    const data: StoredEvent = typeof raw === "string" ? JSON.parse(raw) : raw;
    return migrateLegacyEvent(data);
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
