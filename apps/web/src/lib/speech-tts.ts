/** Lectura en dispositivo con Web Speech API (sin coste ni servidor). */

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const cur = synth.getVoices();
  if (cur.length > 0) return Promise.resolve(cur);

  return new Promise((resolve) => {
    const onChange = () => {
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", onChange);
    window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", onChange);
      resolve(synth.getVoices());
    }, 1500);
  });
}

export function speakWithWebSpeech(text: string, locale = "es-ES"): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Este navegador no puede leer texto en voz alta."));
      return;
    }

    const synth = window.speechSynthesis;

    void (async () => {
      try {
        const voices = await loadVoices();
        synth.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = locale;
        utter.rate = 0.9;
        utter.pitch = 1;
        utter.volume = 1;

        const esVoice =
          voices.find((v) => v.lang === locale) ??
          voices.find((v) => v.lang.startsWith("es")) ??
          voices[0];
        if (esVoice) utter.voice = esVoice;

        let started = false;
        const noStart = window.setTimeout(() => {
          if (!started) {
            synth.cancel();
            reject(new Error("La voz del sistema no arrancó. Prueba pitidos o sube el volumen."));
          }
        }, 4000);

        utter.onstart = () => {
          started = true;
          window.clearTimeout(noStart);
        };
        utter.onend = () => {
          window.clearTimeout(noStart);
          resolve();
        };
        utter.onerror = () => {
          window.clearTimeout(noStart);
          reject(new Error("Error al reproducir la voz del sistema."));
        };

        synth.speak(utter);
        if (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
          window.setTimeout(() => {
            if (synth.paused) synth.resume();
          }, 120);
        }
      } catch (e) {
        reject(e instanceof Error ? e : new Error("No se pudo leer el mensaje."));
      }
    })();
  });
}
