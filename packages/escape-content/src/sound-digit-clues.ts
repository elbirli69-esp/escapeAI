/** Pistas sonoras variables para las 2 primeras cifras de un candado numérico. */

const DIGIT_WORDS: Record<string, string> = {
  "0": "cero",
  "1": "uno",
  "2": "dos",
  "3": "tres",
  "4": "cuatro",
  "5": "cinco",
  "6": "seis",
  "7": "siete",
  "8": "ocho",
  "9": "nueve",
};

export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function digitWord(d: string): string {
  return DIGIT_WORDS[d] ?? d;
}

/** Beeps: N pitidos cortos por cifra; pausa larga entre cifras. */
export function beepPatternForTwoDigits(pair: string): number[] {
  const digits = pair.slice(0, 2).split("");
  const pattern: number[] = [];
  for (let di = 0; di < digits.length; di++) {
    const n = Number(digits[di]);
    const count = Number.isFinite(n) ? (n === 0 ? 10 : n) : 3;
    for (let i = 0; i < count; i++) {
      pattern.push(140, 90);
    }
    if (di < digits.length - 1) {
      pattern.push(450);
    }
  }
  pattern.push(300);
  return pattern;
}

type TtsBuilder = (ctx: {
  d0: string;
  d1: string;
  w0: string;
  w1: string;
  pair: string;
  nickname: string;
  factSnippet: string;
}) => string;

const TTS_VARIANTS: TtsBuilder[] = [
  ({ w0, w1 }) =>
    `Mensaje interceptado. Las dos primeras cifras del candado son ${w0} y ${w1}. Repito: ${w0}, ${w1}.`,
  ({ nickname, w0, w1 }) =>
    `${nickname}, el archivo indica que el candado numérico empieza por ${w0} y ${w1}.`,
  ({ factSnippet, w0, w1 }) =>
    `Según el dato «${factSnippet.slice(0, 40)}», el prefijo del código es ${w0} ${w1}.`,
  ({ d0, d1 }) =>
    `Atención. Primera cifra: ${d0}. Segunda cifra: ${d1}. Fin de transmisión.`,
  ({ w0, w1 }) =>
    `Si escuchas con calma: ${w0}… ${w1}. Esas son las dos primeras cifras.`,
  ({ pair, w0, w1 }) =>
    `Código parcial detectado: ${pair.split("").join(" ")}. En palabras: ${w0} y ${w1}.`,
];

export type ProceduralSoundIntro = {
  soundMode: "beeps" | "tts";
  /** Siempre presente como respaldo si la voz del sistema falla. */
  beepPattern: number[];
  ttsText?: string;
  prompt: string;
  interactionHints: string[];
};

export function buildProceduralSoundIntro(opts: {
  eventId: string;
  twoDigitAnswer: string;
  nickname: string;
  factSnippet: string;
}): ProceduralSoundIntro {
  const pair = opts.twoDigitAnswer.slice(0, 2);
  const d0 = pair[0] ?? "0";
  const d1 = pair[1] ?? "0";
  const w0 = digitWord(d0);
  const w1 = digitWord(d1);
  const h = hash32(opts.eventId);
  const beepPattern = beepPatternForTwoDigits(pair);
  const useTts = h % 4 === 0;
  const variant = TTS_VARIANTS[h % TTS_VARIANTS.length]!;

  const sharedHints = [
    "Lo que escuches aquí son solo las dos primeras cifras del candado de cuatro dígitos de esta sala.",
    "El candado «Primer candado» usa las cuatro cifras; este audio abre el prefijo.",
  ];

  if (useTts) {
    return {
      soundMode: "tts",
      beepPattern,
      ttsText: variant({ d0, d1, w0, w1, pair, nickname: opts.nickname, factSnippet: opts.factSnippet }),
      prompt:
        "Pulsa «Escuchar mensaje». Si no oyes nada, usa «Pitidos de respaldo». Anota las dos primeras cifras del candado.",
      interactionHints: [
        ...sharedHints,
        "Si la voz no suena, activa volumen de multimedia y prueba pitidos.",
      ],
    };
  }

  return {
    soundMode: "beeps",
    beepPattern,
    prompt:
      "Pulsa reproducir. Cada cifra se anuncia con pitidos (uno = un pip, nueve = nueve pips). Anota las dos primeras cifras del candado.",
    interactionHints: [
      ...sharedHints,
      "Entre las dos cifras hay una pausa más larga.",
    ],
  };
}
