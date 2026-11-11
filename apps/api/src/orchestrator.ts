import { toAiContext, type SessionRecord } from "@escapeai/escape-engine";
import type { GameEvent } from "@escapeai/shared";
import { resolveLlmConfig, type LlmProvider } from "./llm-config.js";

export type OrchestratorSource = "fallback" | LlmProvider;

export type OrchestratorResult = {
  message: string;
  source: OrchestratorSource;
};

const FALLBACK_LINES: Record<string, string> = {
  puzzle_failed:
    "El mecanismo rechaza tu intento. Mira la escena otra vez: la pista suele estar donde menos prestas atención.",
  hint_requested:
    "Apunta lo que ya sabes en el diario; las piezas sueltas acaban encajando.",
  scene_entered: "El aire cambia. Algo en esta zona quiere ser descubierto.",
  game_won: "La tensión se disuelve: has desmontado el misterio paso a paso.",
  game_lost: "El reloj gana esta vez. La sala guardará tu progreso si decides volver.",
  ambient:
    "Escuchas zumbidos lejanos y el crujido del edificio. Sigue explorando con calma.",
};

export async function runOrchestrator(
  session: SessionRecord,
  events: GameEvent[],
): Promise<OrchestratorResult> {
  const fallback = buildFallback(session, events);
  const llm = resolveLlmConfig();
  if (!llm) return fallback;

  try {
    const { generateText } = await import("ai");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const client = createOpenAI({
      apiKey: llm.apiKey,
      baseURL: llm.baseURL,
    });
    const context = toAiContext(session);
    const trigger = events[events.length - 1];

    const { text } = await generateText({
      model: client(llm.model),
      system: [
        "Eres el narrador de un escape room en español.",
        "No reveles soluciones ni códigos concretos.",
        "Si hay playerDisplayName, dirígete a esa persona en segunda persona.",
        "Máximo 2 frases, tono inmersivo, sin markdown.",
      ].join(" "),
      prompt: JSON.stringify({
        trigger,
        player: context.playerDisplayName,
        eventTitle: context.eventTitle,
        adventureType: context.adventureType,
        scene: context.sceneTitle,
        description: context.sceneDescription,
        puzzles: context.puzzles.map((p) => ({
          id: p.id,
          solved: p.solved,
          attempts: p.attempts,
          hintsUsed: p.hintsUsed,
        })),
        inventory: context.inventory,
        timeRemainingSec: context.timeRemainingSec,
        recentNarrative: context.recentNarrative,
      }),
    });

    const message = text.trim();
    if (message) return { message, source: llm.provider };
  } catch (err) {
    console.warn("Orchestrator AI failed, using fallback:", err);
  }

  return fallback;
}

function buildFallback(session: SessionRecord, events: GameEvent[]): OrchestratorResult {
  const last = events[events.length - 1];

  if (last?.type === "hint_requested") {
    const puzzle = session.room.puzzles[last.puzzleId];
    const idx = (last.level ?? 1) - 1;
    const curated = puzzle?.hints?.[idx]?.text;
    if (curated) {
      return {
        message: `El conserje murmura: ${curated}`,
        source: "fallback",
      };
    }
  }

  const key = last?.type ?? "ambient";
  let line = FALLBACK_LINES[key] ?? FALLBACK_LINES.ambient;
  if (last?.type === "scene_entered") {
    const title = session.room.scenes[last.sceneId]?.title ?? "";
    line = `${FALLBACK_LINES.scene_entered} — ${title}`;
  }

  return { message: line, source: "fallback" };
}
