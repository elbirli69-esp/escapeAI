import * as Tone from "tone";

type AmbienceHandle = {
  stop: () => void;
};

let active: AmbienceHandle | null = null;
let activeTheme: string | null = null;

export function prefersReducedSensory(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function startRoomAmbience(theme?: string): Promise<void> {
  if (prefersReducedSensory()) return;

  const key = theme === "coastal" ? "coastal" : "urban";
  if (active && activeTheme === key) return;

  await stopRoomAmbience();
  await Tone.start();

  const bus = new Tone.Volume(-34).toDestination();

  if (key === "coastal") {
    const filter = new Tone.Filter({ type: "lowpass", frequency: 420, Q: 0.6 });
    const noise = new Tone.Noise("pink").connect(filter);
    filter.connect(bus);
    noise.volume.value = -22;
    const lfo = new Tone.LFO({ frequency: 0.07, min: 280, max: 720 });
    lfo.connect(filter.frequency);
    noise.start();
    lfo.start();
    active = {
      stop: () => {
        noise.stop();
        lfo.stop();
        noise.dispose();
        lfo.dispose();
        filter.dispose();
        bus.dispose();
      },
    };
  } else {
    const hum = new Tone.Oscillator({ type: "sine", frequency: 54 }).connect(bus);
    hum.volume.value = -28;
    const filter = new Tone.Filter({ type: "lowpass", frequency: 140 });
    const hiss = new Tone.Noise("brown").connect(filter);
    filter.connect(bus);
    hiss.volume.value = -26;
    hum.start();
    hiss.start();
    active = {
      stop: () => {
        hum.stop();
        hiss.stop();
        hum.dispose();
        hiss.dispose();
        filter.dispose();
        bus.dispose();
      },
    };
  }

  activeTheme = key;
}

export async function stopRoomAmbience(): Promise<void> {
  active?.stop();
  active = null;
  activeTheme = null;
}
