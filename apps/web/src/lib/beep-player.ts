import * as Tone from "tone";

/** Reproduce patrón on/off en ms; devuelve duración total en segundos. */
export async function playBeepPattern(pattern: number[]): Promise<number> {
  const { stopRoomAmbience } = await import("./room-ambience");
  await stopRoomAmbience();
  await Tone.start();
  const bus = new Tone.Volume(4).toDestination();
  const synth = new Tone.Synth({
    oscillator: { type: "square" },
    envelope: { attack: 0.005, decay: 0.08, sustain: 0.15, release: 0.08 },
  }).connect(bus);

  let cursor = Tone.now();
  let totalMs = 0;
  for (let i = 0; i < pattern.length; i++) {
    const ms = pattern[i]!;
    totalMs += ms;
    if (i % 2 === 0) {
      synth.triggerAttackRelease("G4", ms / 1000, cursor);
    }
    cursor += ms / 1000;
  }
  await new Promise((r) => setTimeout(r, totalMs + 120));
  synth.dispose();
  return totalMs / 1000;
}

export function patternDurationSec(pattern: number[]): number {
  const totalMs = pattern.reduce((a, b) => a + b, 0);
  return totalMs / 1000;
}
