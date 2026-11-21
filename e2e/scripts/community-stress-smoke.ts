/**
 * Smoke de estrés local: salas aisladas, join codes, cupo equipos.
 * Ejecutar con API en marcha o importar stores en memoria vía tsx en apps/api.
 */
import { randomUUID } from "node:crypto";
import { generateAdventureRoom } from "@escapeai/escape-content";
import { applyAction } from "@escapeai/escape-engine";
import {
  createJoinCode,
  MemoryEventStore,
  migrateLegacyEvent,
  nextTeamSlot,
} from "../../apps/api/src/event-store.js";
import { startEventSession } from "../../apps/api/src/events-routes.js";
import { MemoryGmInterventionStore, GameMasterService } from "../../apps/api/src/gamemaster/index.js";
import { runGameplayAction } from "../../apps/api/src/app-gm.js";
import { MemorySessionStore } from "../../apps/api/src/session-store.js";

type Row = { scenario: string; status: "PASS" | "FAIL" | "PARTIAL"; detail: string };

const rows: Row[] = [];

async function main() {
  const eventStore = new MemoryEventStore();
  const sessionStore = new MemorySessionStore();
  const gm = new GameMasterService(new MemoryGmInterventionStore());

  const config = {
    adventureType: "birthday" as const,
    teamCount: 5,
    durationMin: 45 as const,
    subject: { name: "Test", nickname: "T", age: 30 },
    facts: ["playa", "LUEGO", "1995"],
    eventTitle: "Stress",
  };

  const joinCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = createJoinCode();
    const room = generateAdventureRoom(config, randomUUID());
    await eventStore.create({
      eventId: randomUUID(),
      joinCode: code,
      createdAtMs: Date.now(),
      config,
      title: `Event ${i}`,
      room,
      teams: {},
    });
    joinCodes.push(code);
  }
  rows.push({
    scenario: "10 eventos independientes creados",
    status: joinCodes.length === 10 ? "PASS" : "FAIL",
    detail: `codes=${joinCodes.length}`,
  });

  let sessions = 0;
  const sessionIds: string[] = [];
  for (const code of joinCodes.slice(0, 6)) {
    for (let t = 0; t < 5; t++) {
      const teamId = randomUUID();
      const ev = (await eventStore.getByCode(code))!;
      const slot = Object.keys(ev.teams).length + 1;
      if (slot > 5) break;
      ev.teams[teamId] = {
        teamId,
        teamName: `Team-${t}`,
        slot,
        status: "waiting",
        joinedAtMs: Date.now(),
      };
      await eventStore.save(ev);
      const started = await startEventSession(code, teamId, eventStore, sessionStore, gm);
      if (started.status !== 201) {
        rows.push({
          scenario: `start team slot=${slot} code=${code}`,
          status: "FAIL",
          detail: `status=${started.status}`,
        });
        continue;
      }
      const sid = (started.body as { sessionId: string }).sessionId;
      sessionIds.push(sid);
      sessions++;
    }
  }
  rows.push({
    scenario: "30 sesiones (6 eventos × 5 equipos)",
    status: sessions === 30 ? "PASS" : "FAIL",
    detail: `sessions=${sessions}`,
  });

  const fullCode = joinCodes[0]!;
  const evFull = migrateLegacyEvent((await eventStore.getByCode(fullCode))!);
  const slotSix = nextTeamSlot(evFull);
  rows.push({
    scenario: "6º equipo en evento lleno (cupo join)",
    status: slotSix === undefined ? "PASS" : "FAIL",
    detail:
      slotSix === undefined
        ? "nextTeamSlot=undefined (equiv. HTTP 409 en POST join)"
        : `slot libre inesperado=${slotSix}`,
  });

  const bad = await startEventSession("BADBAD", randomUUID(), eventStore, sessionStore, gm);
  rows.push({
    scenario: "código inexistente",
    status: bad.status === 404 ? "PASS" : "FAIL",
    detail: `status=${bad.status}`,
  });

  const sid = sessionIds[0]!;
  const sessionA = (await sessionStore.get(sid))!;
  await Promise.all([
    runGameplayAction({
      session: sessionA,
      action: { type: "submit_answer", puzzleId: "entry_lock", value: "0000" },
      sessionStore,
      eventStore,
      gm,
    }),
    runGameplayAction({
      session: (await sessionStore.get(sessionIds[1]!))!,
      action: { type: "submit_answer", puzzleId: "entry_lock", value: "1111" },
      sessionStore,
      eventStore,
      gm,
    }),
  ]);
  const afterA = (await sessionStore.get(sid))!;
  const afterB = (await sessionStore.get(sessionIds[1]!))!;
  const attemptsA = afterA.puzzleAttempts.get("entry_lock") ?? 0;
  const attemptsB = afterB.puzzleAttempts.get("entry_lock") ?? 0;
  rows.push({
    scenario: "acciones paralelas en 2 sesiones distintas",
    status: attemptsA >= 1 && attemptsB >= 1 ? "PASS" : "FAIL",
    detail: `A=${attemptsA} B=${attemptsB}`,
  });

  const sameSession = (await sessionStore.get(sid))!;
  const beforeAttempts = sameSession.puzzleAttempts.get("entry_lock") ?? 0;
  await Promise.all([
    runGameplayAction({
      session: sameSession,
      action: { type: "submit_answer", puzzleId: "entry_lock", value: "2222" },
      sessionStore,
      eventStore,
      gm,
    }),
    runGameplayAction({
      session: (await sessionStore.get(sid))!,
      action: { type: "submit_answer", puzzleId: "entry_lock", value: "3333" },
      sessionStore,
      eventStore,
      gm,
    }),
  ]);
  const afterSame = (await sessionStore.get(sid))!;
  const afterAttempts = afterSame.puzzleAttempts.get("entry_lock") ?? 0;
  const raceOk = afterAttempts >= beforeAttempts + 1 && afterAttempts <= beforeAttempts + 2;
  rows.push({
    scenario: "carrera: 2 POST misma sesión (sin lock)",
    status: raceOk ? "PARTIAL" : "FAIL",
    detail: `attempts ${beforeAttempts}→${afterAttempts} (last-write-wins posible)`,
  });

  console.log(JSON.stringify({ rows, joinCodesSample: joinCodes.slice(0, 3), sessionCount: sessions }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});