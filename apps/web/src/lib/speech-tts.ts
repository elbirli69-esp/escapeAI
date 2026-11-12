/** Lectura en dispositivo con Web Speech API (sin coste ni servidor). */

export function speakWithWebSpeech(
  text: string,
  locale = "es-ES",
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Este navegador no puede leer texto en voz alta."));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = locale;
    utter.rate = 0.92;
    utter.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find((v) => v.lang.startsWith("es"));
    if (esVoice) utter.voice = esVoice;

    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("Error al reproducir la voz del sistema."));
    window.speechSynthesis.speak(utter);
  });
}
