export const DEFAULT_VOSK_MODEL_URL =
  import.meta.env.VITE_VOSK_MODEL_URL ??
  "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-es-0.42.tar.gz";

/**
 * Escucha durante durationMs y devuelve texto (cliente; descarga modelo la primera vez).
 */
export async function listenWithVosk(
  modelUrl: string = DEFAULT_VOSK_MODEL_URL,
  durationMs = 5000,
): Promise<string> {
  const { createModel } = await import("vosk-browser");
  const model = await createModel(modelUrl);
  const sampleRate = 16000;
  const recognizer = new model.KaldiRecognizer(sampleRate);

  let text = "";
  recognizer.on("result", (message) => {
    if (message.event === "result") {
      const line = message.result.text?.trim();
      if (line) text = line;
    }
  });
  recognizer.on("partialresult", (message) => {
    if (message.event === "partialresult") {
      const line = message.result.partial?.trim();
      if (line) text = line;
    }
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    video: false,
  });

  const audioCtx = new AudioContext({ sampleRate });
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  return await new Promise<string>((resolve, reject) => {
    const stop = () => {
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void audioCtx.close();
      try {
        recognizer.retrieveFinalResult();
      } catch {
        /* ignore */
      }
      recognizer.remove();
      model.terminate();
    };

    const timeout = window.setTimeout(() => {
      stop();
      resolve(text.trim());
    }, durationMs);

    processor.onaudioprocess = (ev) => {
      try {
        recognizer.acceptWaveform(ev.inputBuffer);
      } catch (err) {
        window.clearTimeout(timeout);
        stop();
        reject(err instanceof Error ? err : new Error("Reconocimiento offline fallido"));
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  });
}
