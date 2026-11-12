/** OCR local con Tesseract (lazy). La imagen no sale del dispositivo salvo el worker WASM. */
export async function recognizeTextFromDataUrl(
  dataUrl: string,
  langs = "spa+eng",
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(langs);
  try {
    const {
      data: { text },
    } = await worker.recognize(dataUrl);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export function extractDigitHint(text: string): string | undefined {
  const digits = text.replace(/\D/g, "");
  return digits[0];
}
