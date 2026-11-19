import type { RoomDefinition } from "@escapeai/escape-engine";
import rubric from "../rubric-components.json" with { type: "json" };
import type { ProfileRuntimeMetrics } from "../fixtures/experience-metrics-io.js";

export type ContentMetrics = {
  taglineWords: number;
  firstSceneDescChars: number;
  sessionStartedBeats: number;
  beatCount: number;
  sceneCount: number;
  puzzleCount: number;
  puzzleTypesDistinct: number;
  sensoryTypeCount: number;
  hasTimeLimit: boolean;
  winPathPuzzles: number;
  roomId?: string;
  isDemoLab?: boolean;
};

export type ScoreComponent = {
  id: string;
  maxPoints: number;
  points: number;
  rule: string;
  evidence: string;
  improvementHint: string;
};

export type DimensionScore = {
  id: string;
  score: number;
  maxScore: 10;
  components: ScoreComponent[];
};

function hint(id: string): string {
  return (rubric.improvementHints as Record<string, string>)[id] ?? id;
}

function timeToPuzzlePoints(ms: number | undefined): { points: number; evidence: string } {
  if (ms == null) return { points: 0, evidence: "sin medición (ejecutar experience-metrics.spec)" };
  const tiers = rubric.timeToFirstPuzzleMs as Array<{ maxMs: number | null; points: number }>;
  for (const tier of tiers) {
    if (tier.maxMs == null || ms <= tier.maxMs) {
      return { points: tier.points, evidence: `timeToFirstPuzzleMs=${ms} (tier ≤${tier.maxMs ?? "∞"}ms → ${tier.points}pts)` };
    }
  }
  return { points: 0.5, evidence: `timeToFirstPuzzleMs=${ms}` };
}

export function contentMetricsFromRoom(room: RoomDefinition, roomId?: string): ContentMetrics {
  const scenes = Object.values(room.scenes ?? {});
  const start = room.scenes?.[room.startSceneId];
  const desc = [start?.description, start?.mood].filter(Boolean).join(" ");
  const beats = room.beats ?? [];
  const puzzles = Object.values(room.puzzles ?? {});
  const types = new Set(puzzles.map((p) => p.type));
  const sensory = [...types].filter((t) => ["sound", "voice", "camera", "visual", "location"].includes(t));

  return {
    taglineWords: (room.tagline ?? "").trim().split(/\s+/).filter(Boolean).length,
    firstSceneDescChars: desc.replace(/\s+/g, " ").trim().length,
    sessionStartedBeats: beats.filter((b) => b.after === "session_started").length,
    beatCount: beats.length,
    sceneCount: scenes.length,
    puzzleCount: puzzles.length,
    puzzleTypesDistinct: types.size,
    sensoryTypeCount: sensory.length,
    hasTimeLimit: Boolean(room.timeLimitSec),
    winPathPuzzles: puzzles.length,
    roomId,
    isDemoLab: roomId === "interactive-lab",
  };
}

function clamp10(n: number): number {
  return Math.round(Math.min(10, Math.max(0, n)) * 100) / 100;
}

export function scoreHook(content: ContentMetrics, rt: ProfileRuntimeMetrics): DimensionScore {
  const components: ScoreComponent[] = [];

  const taglinePts = content.taglineWords >= 6 ? 2 : (content.taglineWords / 6) * 2;
  components.push({
    id: "c_tagline",
    maxPoints: 2,
    points: taglinePts,
    rule: "taglineWords>=6",
    evidence: `taglineWords=${content.taglineWords}`,
    improvementHint: hint("c_tagline"),
  });

  const scenePts = (Math.min(content.firstSceneDescChars, 120) / 120) * 2;
  components.push({
    id: "c_firstSceneCopy",
    maxPoints: 2,
    points: scenePts,
    rule: "min(firstSceneDescChars,120)/120*2",
    evidence: `firstSceneDescChars=${content.firstSceneDescChars}`,
    improvementHint: hint("c_firstSceneCopy"),
  });

  const beatPts = content.sessionStartedBeats >= 1 ? 2 : 0;
  components.push({
    id: "c_stakesBeat",
    maxPoints: 2,
    points: beatPts,
    rule: "sessionStartedBeats>=1",
    evidence: `sessionStartedBeats=${content.sessionStartedBeats}`,
    improvementHint: hint("c_stakesBeat"),
  });

  const { points: timePts, evidence: timeEv } = timeToPuzzlePoints(rt.timeToFirstPuzzleMs);
  components.push({
    id: "c_timeToFirstPuzzle",
    maxPoints: 4,
    points: timePts,
    rule: "piecewise_ms",
    evidence: timeEv,
    improvementHint: hint("c_timeToFirstPuzzle"),
  });

  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  return { id: "hook", score: clamp10((sum / max) * 10), maxScore: 10, components };
}

export function scoreFun(
  content: ContentMetrics,
  rt: ProfileRuntimeMetrics,
  caps?: { max?: number; reason?: string },
): DimensionScore {
  const components: ScoreComponent[] = [];

  components.push({
    id: "c_narrativeBeats",
    maxPoints: 2.5,
    points: Math.min(content.beatCount / 4, 1) * 2.5,
    rule: "min(beatCount/4,1)*2.5",
    evidence: `beatCount=${content.beatCount}`,
    improvementHint: hint("c_narrativeBeats"),
  });
  components.push({
    id: "c_sceneDepth",
    maxPoints: 2.5,
    points: Math.min(content.sceneCount / 4, 1) * 2.5,
    rule: "min(sceneCount/4,1)*2.5",
    evidence: `sceneCount=${content.sceneCount}`,
    improvementHint: hint("c_sceneDepth"),
  });
  components.push({
    id: "c_gmPresence",
    maxPoints: 2.5,
    points: Math.min((rt.gmLinesBeforeFirstSolve ?? 0) / 2, 1) * 2.5,
    rule: "min(gmLines/2,1)*2.5",
    evidence: `gmLinesBeforeFirstSolve=${rt.gmLinesBeforeFirstSolve ?? 0}`,
    improvementHint: hint("c_gmPresence"),
  });

  const winPts = rt.wonInE2e ? 2.5 : rt.partialWin ? 1.25 : 0;
  components.push({
    id: "c_winCoverage",
    maxPoints: 2.5,
    points: winPts,
    rule: "won|partial|none",
    evidence: `wonInE2e=${Boolean(rt.wonInE2e)} partialWin=${Boolean(rt.partialWin)}`,
    improvementHint: hint("c_winCoverage"),
  });

  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  let score = clamp10((sum / max) * 10);
  if (content.isDemoLab && !rt.wonInE2e) {
    score = Math.min(score, 6);
  }
  if (caps?.max != null) score = Math.min(score, caps.max);
  return { id: "fun", score, maxScore: 10, components };
}

export function scoreChallenge(content: ContentMetrics, rt: ProfileRuntimeMetrics): DimensionScore {
  const denom = Math.min(Math.max(content.puzzleCount, 1), 4);
  const components: ScoreComponent[] = [
    {
      id: "c_puzzleDepth",
      maxPoints: 2.5,
      points: (Math.min(content.winPathPuzzles, 5) / 5) * 2.5,
      rule: "min(winPathPuzzles/5,1)*2.5",
      evidence: `winPathPuzzles=${content.winPathPuzzles}`,
      improvementHint: hint("c_puzzleDepth"),
    },
    {
      id: "c_sceneDepth",
      maxPoints: 2,
      points: (Math.min(content.sceneCount, 3) / 3) * 2,
      rule: "min(sceneCount/3,1)*2",
      evidence: `sceneCount=${content.sceneCount}`,
      improvementHint: hint("c_sceneDepth"),
    },
    {
      id: "c_timePressure",
      maxPoints: 1.5,
      points: content.hasTimeLimit ? 1.5 : 0,
      rule: "hasTimeLimit",
      evidence: `hasTimeLimit=${content.hasTimeLimit}`,
      improvementHint: hint("c_timePressure"),
    },
    {
      id: "c_failForward",
      maxPoints: 2,
      points: rt.wrongAttemptFeedback ? 2 : 0,
      rule: "wrongAttemptFeedback",
      evidence: `wrongAttemptFeedback=${Boolean(rt.wrongAttemptFeedback)}`,
      improvementHint: hint("c_failForward"),
    },
    {
      id: "c_typeSpread",
      maxPoints: 2,
      points: (content.puzzleTypesDistinct / denom) * 2,
      rule: "distinct/min(puzzles,4)*2",
      evidence: `puzzleTypesDistinct=${content.puzzleTypesDistinct} puzzleCount=${content.puzzleCount}`,
      improvementHint: hint("c_typeSpread"),
    },
  ];
  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  return { id: "challenge", score: clamp10((sum / max) * 10), maxScore: 10, components };
}

export function scoreVariety(content: ContentMetrics): DimensionScore {
  const denom = Math.min(Math.max(content.puzzleCount, 1), 6);
  const components: ScoreComponent[] = [
    {
      id: "c_typeSpread",
      maxPoints: 4,
      points: (content.puzzleTypesDistinct / denom) * 4,
      rule: "distinct/min(puzzles,6)*4",
      evidence: `puzzleTypesDistinct=${content.puzzleTypesDistinct}`,
      improvementHint: hint("c_typeSpread"),
    },
    {
      id: "c_sensoryMix",
      maxPoints: 3,
      points: (Math.min(content.sensoryTypeCount, 3) / 3) * 3,
      rule: "sensory types",
      evidence: `sensoryTypeCount=${content.sensoryTypeCount}`,
      improvementHint: hint("c_sensoryMix"),
    },
    {
      id: "c_sceneDepth",
      maxPoints: 3,
      points: (Math.min(content.sceneCount, 3) / 3) * 3,
      rule: "sceneCount",
      evidence: `sceneCount=${content.sceneCount}`,
      improvementHint: hint("c_sceneDepth"),
    },
  ];
  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  return { id: "variety", score: clamp10((sum / max) * 10), maxScore: 10, components };
}

export function scoreFlow(
  allSpecsPass: boolean,
  rt: ProfileRuntimeMetrics,
  profileId: string,
): DimensionScore {
  const partialUx =
    profileId === "session-resume" || profileId === "gamemaster-persistence" ? 2 : allSpecsPass ? 2 : 0;
  const components: ScoreComponent[] = [
    {
      id: "c_e2eSpecsGreen",
      maxPoints: 6,
      points: allSpecsPass ? 6 : 0,
      rule: "allSpecsPass",
      evidence: `allSpecsPass=${allSpecsPass}`,
      improvementHint: hint("c_e2eSpecsGreen"),
    },
    {
      id: "c_uiStability",
      maxPoints: 2,
      points: rt.wrongAttemptNoFlash !== false ? 2 : 0,
      rule: "no flash on wrong attempt",
      evidence: `wrongAttemptNoFlash=${rt.wrongAttemptNoFlash ?? "n/a"}`,
      improvementHint: hint("c_uiStability"),
    },
    {
      id: "c_partialUx",
      maxPoints: 2,
      points: partialUx,
      rule: "profile ux specs",
      evidence: `profileId=${profileId}`,
      improvementHint: hint("c_e2eSpecsGreen"),
    },
  ];
  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  return { id: "flow", score: clamp10((sum / max) * 10), maxScore: 10, components };
}

export function scoreClosure(rt: ProfileRuntimeMetrics): DimensionScore {
  const components: ScoreComponent[] = [
    {
      id: "c_victoryPayoff",
      maxPoints: 4,
      points: rt.wonInE2e ? 4 : 0,
      rule: "wonInE2e",
      evidence: `wonInE2e=${Boolean(rt.wonInE2e)}`,
      improvementHint: hint("c_victoryPayoff"),
    },
    {
      id: "c_victoryNarrativeLength",
      maxPoints: 2.5,
      points: (Math.min(rt.victoryBodyChars ?? 0, 80) / 80) * 2.5,
      rule: "victoryBodyChars/80",
      evidence: `victoryBodyChars=${rt.victoryBodyChars ?? 0}`,
      improvementHint: hint("c_victoryNarrativeLength"),
    },
    {
      id: "c_victoryTaglineEcho",
      maxPoints: 1.75,
      points: rt.victoryIncludesTagline ? 1.75 : 0,
      rule: "tagline echo",
      evidence: `victoryIncludesTagline=${Boolean(rt.victoryIncludesTagline)}`,
      improvementHint: hint("c_victoryTaglineEcho"),
    },
    {
      id: "c_victoryRoomEcho",
      maxPoints: 1.75,
      points: rt.victoryIncludesRoomName ? 1.75 : 0,
      rule: "room name echo",
      evidence: `victoryIncludesRoomName=${Boolean(rt.victoryIncludesRoomName)}`,
      improvementHint: hint("c_victoryNarrativeLength"),
    },
  ];
  const sum = components.reduce((a, c) => a + c.points, 0);
  const max = components.reduce((a, c) => a + c.maxPoints, 0);
  return { id: "closure", score: clamp10((sum / max) * 10), maxScore: 10, components };
}

export function profileTotal(
  dimensions: Record<string, DimensionScore>,
  weights: Record<string, number>,
): number {
  let sum = 0;
  let w = 0;
  for (const [id, weight] of Object.entries(weights)) {
    const d = dimensions[id];
    if (!d) continue;
    sum += d.score * weight;
    w += weight;
  }
  return w > 0 ? clamp10(sum / w) : 0;
}