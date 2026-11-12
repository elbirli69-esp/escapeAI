import * as Tone from "tone";

/** Reproduce patrón on/off en ms; devuelve duración total en segundos. */
export async function playBeepPattern(pattern: number[]): Promise<number> {
  await Tone.start();
  const synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
  }).toDestination();

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
  await new Promise((r) => setTimeout(r, totalMs + 50));
  synth.dispose();
  return totalMs / 1000;
}
