import type { InteractionStep, PublicPuzzle } from "@escapeai/shared";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchFalImage, fetchPexelsImage } from "./api";

type ActionSender = (
  action:
    | { type: "submit_answer"; puzzleId: string; value: string }
    | { type: "complete_interaction"; puzzleId: string; step: InteractionStep }
    | { type: "request_hint"; puzzleId: string },
) => void;

export function InteractivePuzzle(props: {
  puzzle: PublicPuzzle;
  answer: string;
  onAnswerChange: (v: string) => void;
  busy: boolean;
  onAction: ActionSender;
}) {
  const { puzzle } = props;

  if (puzzle.puzzleType === "code" || puzzle.puzzleType === "inventory") {
    return (
      <ClassicPuzzleForm
        puzzle={puzzle}
        answer={props.answer}
        busy={props.busy}
        onAnswerChange={props.onAnswerChange}
        onAction={props.onAction}
      />
    );
  }

  return (
    <div className="interactive-puzzle">
      {puzzle.puzzleType === "sound" && (
        <SoundStation puzzle={puzzle} busy={props.busy} onAction={props.onAction} />
      )}
      {puzzle.puzzleType === "visual" && (
        <VisualStation puzzle={puzzle} busy={props.busy} onAction={props.onAction} />
      )}
      {puzzle.puzzleType === "camera" && (
        <CameraStation puzzle={puzzle} busy={props.busy} onAction={props.onAction} />
      )}
      {puzzle.puzzleType === "voice" && (
        <VoiceStation puzzle={puzzle} busy={props.busy} onAction={props.onAction} />
      )}

      {isAnswerable(puzzle.puzzleType) && puzzle.puzzleType !== "voice" && (
        <ClassicPuzzleForm
          puzzle={puzzle}
          answer={props.answer}
          busy={props.busy}
          onAnswerChange={props.onAnswerChange}
          onAction={props.onAction}
          submitDisabled={!canSubmitAnswer(puzzle)}
        />
      )}
    </div>
  );
}

function isAnswerable(type: PublicPuzzle["puzzleType"]): boolean {
  return ["code", "sound", "voice", "camera", "visual"].includes(type);
}

function canSubmitAnswer(puzzle: PublicPuzzle): boolean {
  switch (puzzle.puzzleType) {
    case "sound":
      return puzzle.completedSteps.includes("listen");
    case "voice":
      return puzzle.completedSteps.includes("speak");
    case "camera":
      return puzzle.completedSteps.includes("capture");
    case "visual":
      return puzzle.completedSteps.includes("view");
    default:
      return true;
  }
}

function ClassicPuzzleForm(props: {
  puzzle: PublicPuzzle;
  answer: string;
  busy: boolean;
  onAnswerChange: (v: string) => void;
  onAction: ActionSender;
  submitDisabled?: boolean;
}) {
  const { puzzle } = props;
  return (
    <>
      <p className="puzzle-prompt">{puzzle.prompt}</p>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!props.answer.trim() || props.submitDisabled) return;
          props.onAction({
            type: "submit_answer",
            puzzleId: puzzle.id,
            value: props.answer,
          });
          props.onAnswerChange("");
        }}
      >
        <input
          value={props.answer}
          onChange={(e) => props.onAnswerChange(e.target.value)}
          placeholder="Tu respuesta"
          autoComplete="off"
          disabled={props.submitDisabled}
        />
        <button
          type="submit"
          className="primary"
          disabled={props.busy || props.submitDisabled}
        >
          Enviar
        </button>
      </form>
      <button
        type="button"
        className="ghost"
        disabled={props.busy}
        onClick={() => props.onAction({ type: "request_hint", puzzleId: puzzle.id })}
      >
        Pedir pista ({puzzle.hintsUsed}/{puzzle.maxHints})
      </button>
    </>
  );
}

function SoundStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const listened = props.puzzle.completedSteps.includes("listen");
  return (
    <InteractionPanel title="Altavoz" done={listened}>
      <audio
        controls
        className="audio-player"
        src={props.puzzle.audioUrl}
        onEnded={() =>
          props.onAction({
            type: "complete_interaction",
            puzzleId: props.puzzle.id,
            step: "listen",
          })
        }
      />
      <p className="muted sm">Reproduce el audio hasta el final para desbloquear la respuesta.</p>
    </InteractionPanel>
  );
}

function VisualStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const [url, setUrl] = useState(props.puzzle.visualUrl ?? "");
  const [err, setErr] = useState<string | null>(null);
  const viewed = props.puzzle.completedSteps.includes("view");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (props.puzzle.visualUrl) {
        setUrl(props.puzzle.visualUrl);
        return;
      }
      try {
        if (props.puzzle.falPrompt) {
          const res = await fetchFalImage(props.puzzle.falPrompt);
          if (!cancelled) setUrl(res.url);
        } else if (props.puzzle.pexelsQuery) {
          const res = await fetchPexelsImage(props.puzzle.pexelsQuery);
          if (!cancelled) setUrl(res.url);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.puzzle.visualUrl, props.puzzle.pexelsQuery, props.puzzle.falPrompt]);

  return (
    <InteractionPanel title="Prueba visual" done={viewed}>
      {err && <p className="error sm">{err}</p>}
      {url ? (
        <figure className="visual-puzzle">
          <img src={url} alt="" loading="lazy" />
        </figure>
      ) : (
        <p className="muted">Cargando imagen…</p>
      )}
      <button
        type="button"
        className="chip chip-action"
        disabled={props.busy || !url || viewed}
        onClick={() =>
          props.onAction({
            type: "complete_interaction",
            puzzleId: props.puzzle.id,
            step: "view",
          })
        }
      >
        {viewed ? "Imagen revisada" : "He mirado la imagen"}
      </button>
    </InteractionPanel>
  );
}

function CameraStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraErr, setCameraErr] = useState<string | null>(null);
  const captured = props.puzzle.completedSteps.includes("capture");

  const startCamera = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(media);
      if (videoRef.current) videoRef.current.srcObject = media;
    } catch {
      setCameraErr("No se pudo abrir la cámara. Revisa permisos.");
    }
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreview(canvas.toDataURL("image/jpeg", 0.85));
    props.onAction({
      type: "complete_interaction",
      puzzleId: props.puzzle.id,
      step: "capture",
    });
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  return (
    <InteractionPanel title="Cámara · entorno real" done={captured}>
      <p className="muted">{props.puzzle.cameraPrompt}</p>
      {cameraErr && <p className="error sm">{cameraErr}</p>}
      {!preview ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="camera-preview" />
          {!stream ? (
            <button type="button" className="primary" disabled={props.busy} onClick={() => void startCamera()}>
              Abrir cámara
            </button>
          ) : (
            <button type="button" className="primary" disabled={props.busy} onClick={takePhoto}>
              Capturar foto
            </button>
          )}
        </>
      ) : (
        <img src={preview} alt="" className="camera-shot" />
      )}
    </InteractionPanel>
  );
}

function VoiceStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const spoke = props.puzzle.completedSteps.includes("speak");

  function startListen() {
    type SpeechRecCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecCtor;
      webkitSpeechRecognition?: SpeechRecCtor;
    };
    const SR = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!SR) {
      setVoiceErr("Este navegador no soporta reconocimiento de voz.");
      return;
    }
    const rec = new SR();
    rec.lang = props.puzzle.voiceLocale ?? "es-ES";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setVoiceErr(null);
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript ?? "";
      setTranscript(text);
      props.onAction({
        type: "complete_interaction",
        puzzleId: props.puzzle.id,
        step: "speak",
      });
      props.onAction({
        type: "submit_answer",
        puzzleId: props.puzzle.id,
        value: text,
      });
      setListening(false);
    };
    rec.onerror = () => {
      setVoiceErr("No se entendió. Inténtalo otra vez.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.start();
  }

  return (
    <InteractionPanel title="Micrófono" done={spoke}>
      <p className="puzzle-prompt">{props.puzzle.prompt}</p>
      {voiceErr && <p className="error sm">{voiceErr}</p>}
      {transcript && <p className="muted">Oído: «{transcript}»</p>}
      <button
        type="button"
        className="primary"
        disabled={props.busy || listening || spoke}
        onClick={startListen}
      >
        {listening ? "Escuchando…" : spoke ? "Voz registrada" : "Hablar ahora"}
      </button>
    </InteractionPanel>
  );
}

function InteractionPanel(props: { title: string; done?: boolean; children: ReactNode }) {
  return (
    <section className={`panel glass interaction-panel ${props.done ? "done" : ""}`}>
      <h3 className="interaction-title">
        {props.title}
        {props.done && <span className="chip"> ✓</span>}
      </h3>
      {props.children}
    </section>
  );
}
