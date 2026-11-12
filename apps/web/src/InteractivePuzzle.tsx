import type { InteractionStep, PublicPuzzle } from "@escapeai/shared";
import { Howl } from "howler";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Webcam from "react-webcam";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { PermissionGate } from "./PermissionGate";
import { fetchFalImage, fetchPexelsImage } from "./api";
import { playBeepPattern } from "./lib/beep-player";

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
        <VoiceStation
          puzzle={puzzle}
          busy={props.busy}
          onAction={props.onAction}
        />
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
  const minSec = props.puzzle.minListenSec ?? 2;
  const [listenSec, setListenSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const howlRef = useRef<Howl | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markListened = useCallback(() => {
    if (listened) return;
    props.onAction({
      type: "complete_interaction",
      puzzleId: props.puzzle.id,
      step: "listen",
    });
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      navigator.vibrate?.(40);
    } catch {
      /* ignore */
    }
  }, [listened, props]);

  useEffect(() => {
    return () => {
      howlRef.current?.unload();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function playBeeps() {
    setErr(null);
    setPlaying(true);
    setListenSec(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setListenSec(Math.floor((Date.now() - start) / 1000));
    }, 400);
    try {
      const pattern = props.puzzle.beepPattern ?? [200, 100, 200];
      await playBeepPattern(pattern);
      if ((Date.now() - start) / 1000 >= minSec) markListened();
    } catch {
      setErr("No se pudo reproducir el patrón de tonos.");
    } finally {
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function playUrl() {
    setErr(null);
    if (!props.puzzle.audioUrl) return;
    howlRef.current?.unload();
    const howl = new Howl({
      src: [props.puzzle.audioUrl],
      html5: true,
      onend: () => {
        setPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
        markListened();
      },
      onplayerror: () => setErr("Pulsa reproducir de nuevo (el navegador bloqueó el audio)."),
    });
    howlRef.current = howl;
    setPlaying(true);
    setListenSec(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      setListenSec(sec);
      if (sec >= minSec && !listened) markListened();
    }, 500);
    howl.play();
  }

  const useBeeps = props.puzzle.soundMode === "beeps" || !props.puzzle.audioUrl;

  return (
    <InteractionPanel title="Altavoz" done={listened}>
      {props.puzzle.interactionHints?.map((h) => (
        <p key={h} className="muted sm">
          {h}
        </p>
      ))}
      {err && <p className="error sm">{err}</p>}
      {useBeeps ? (
        <button
          type="button"
          className="primary"
          disabled={props.busy || playing || listened}
          onClick={() => void playBeeps()}
        >
          {playing ? "Reproduciendo tonos…" : listened ? "Escuchado" : "Reproducir pista"}
        </button>
      ) : (
        <button
          type="button"
          className="primary"
          disabled={props.busy || playing || listened}
          onClick={playUrl}
        >
          {playing ? "Reproduciendo…" : listened ? "Escuchado" : "Reproducir audio"}
        </button>
      )}
      <p className="muted sm">
        Tiempo: {listenSec}s / mínimo {minSec}s
        {listened ? " · Listo para responder" : " · Escucha antes de enviar"}
      </p>
    </InteractionPanel>
  );
}

function VisualStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const [url, setUrl] = useState(props.puzzle.visualUrl ?? "");
  const [urlB, setUrlB] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [dwellSec, setDwellSec] = useState(0);
  const viewed = props.puzzle.completedSteps.includes("view");
  const dual = props.puzzle.visualLayout === "dual" && props.puzzle.pexelsQueryB;

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
        if (props.puzzle.pexelsQueryB) {
          const resB = await fetchPexelsImage(props.puzzle.pexelsQueryB);
          if (!cancelled) setUrlB(resB.url);
        }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    props.puzzle.visualUrl,
    props.puzzle.pexelsQuery,
    props.puzzle.pexelsQueryB,
    props.puzzle.falPrompt,
  ]);

  useEffect(() => {
    if (!url || viewed) return;
    const t = setInterval(() => setDwellSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [url, viewed]);

  useEffect(() => {
    if (dwellSec >= 2 && !viewed && url) {
      props.onAction({
        type: "complete_interaction",
        puzzleId: props.puzzle.id,
        step: "view",
      });
    }
  }, [dwellSec, viewed, url, props]);

  function markViewed() {
    if (viewed || !url) return;
    props.onAction({
      type: "complete_interaction",
      puzzleId: props.puzzle.id,
      step: "view",
    });
  }

  return (
    <InteractionPanel title="Prueba visual" done={viewed}>
      {err && <p className="error sm">{err}</p>}
      {url ? (
        <TransformWrapper minScale={1} maxScale={4} centerOnInit>
          <TransformComponent wrapperClass="visual-zoom-wrap" contentClass="visual-zoom-content">
            <figure className="visual-puzzle">
              <img src={url} alt="" loading="lazy" />
              {dual && urlB && (
                <img src={urlB} alt="" loading="lazy" className="visual-secondary" />
              )}
            </figure>
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <p className="muted">Cargando imagen…</p>
      )}
      <button
        type="button"
        className="chip chip-action"
        disabled={props.busy || !url || viewed}
        onClick={markViewed}
      >
        {viewed ? "Imagen revisada" : "He estudiado la imagen"}
      </button>
      <p className="muted sm">Haz zoom con dos dedos. El paso se marca tras 2s en pantalla o con el botón.</p>
    </InteractionPanel>
  );
}

function CameraStation(props: {
  puzzle: PublicPuzzle;
  busy: boolean;
  onAction: ActionSender;
}) {
  const webcamRef = useRef<Webcam>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraErr, setCameraErr] = useState<string | null>(null);
  const [cameraLive, setCameraLive] = useState(false);
  const captured = props.puzzle.completedSteps.includes("capture");
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  const videoConstraints = {
    facingMode: facing,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const startCamera = useCallback(() => {
    setCameraErr(null);
    setCameraLive(true);
  }, []);

  const takePhoto = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot({ width: 1280, height: 720 });
    if (!shot) {
      setCameraErr("No se pudo capturar. Prueba otra vez.");
      return;
    }
    setPreview(shot);
    setCameraLive(false);
    props.onAction({
      type: "complete_interaction",
      puzzleId: props.puzzle.id,
      step: "capture",
    });
  }, [props]);

  return (
    <InteractionPanel title="Cámara · entorno real" done={captured}>
      <p className="muted">{props.puzzle.cameraPrompt}</p>
      {cameraErr && <p className="error sm">{cameraErr}</p>}
      {!preview ? (
        <>
          {cameraLive ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="camera-preview"
              onUserMediaError={() => {
                setCameraErr("No se pudo abrir la cámara.");
                setCameraLive(false);
              }}
            />
          ) : (
            <PermissionGate kind="camera" onRequest={startCamera} denied={Boolean(cameraErr)} />
          )}
          {cameraLive && (
            <div className="row camera-actions">
              <button type="button" className="ghost sm" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
                Cambiar cámara
              </button>
              <button type="button" className="primary" disabled={props.busy} onClick={takePhoto}>
                Capturar foto
              </button>
            </div>
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
  const [textFallback, setTextFallback] = useState("");
  const [micReady, setMicReady] = useState(false);
  const spoke = props.puzzle.completedSteps.includes("speak");
  const allowText = props.puzzle.allowTextFallback !== false;

  function submitVoice(value: string) {
    props.onAction({
      type: "complete_interaction",
      puzzleId: props.puzzle.id,
      step: "speak",
    });
    props.onAction({
      type: "submit_answer",
      puzzleId: props.puzzle.id,
      value,
    });
  }

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
      setVoiceErr("Este navegador no soporta reconocimiento de voz. Usa el campo de texto.");
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
      submitVoice(text);
      setListening(false);
    };
    rec.onerror = () => {
      setVoiceErr("No se entendió. Inténtalo otra vez o escribe la frase.");
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
      {!micReady ? (
        <PermissionGate kind="microphone" onRequest={() => setMicReady(true)} />
      ) : (
        <button
          type="button"
          className="primary"
          disabled={props.busy || listening || spoke}
          onClick={startListen}
        >
          {listening ? "Escuchando…" : spoke ? "Voz registrada" : "Hablar ahora"}
        </button>
      )}
      {allowText && !spoke && (
        <form
          className="row voice-fallback"
          onSubmit={(e) => {
            e.preventDefault();
            if (!textFallback.trim()) return;
            submitVoice(textFallback);
            setTextFallback("");
          }}
        >
          <input
            value={textFallback}
            onChange={(e) => setTextFallback(e.target.value)}
            placeholder="O escribe la frase aquí"
            autoComplete="off"
          />
          <button type="button" className="ghost" disabled={props.busy} onClick={() => submitVoice(textFallback)}>
            Enviar texto
          </button>
        </form>
      )}
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
