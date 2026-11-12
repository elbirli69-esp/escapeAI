/** Lectura local de QR/códigos en captura. La imagen no sale del dispositivo. */

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = dataUrl;
  });
}

async function decodeWithBarcodeDetector(canvas: HTMLCanvasElement): Promise<string | null> {
  const BarcodeDetectorCtor = (globalThis as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
  if (!BarcodeDetectorCtor) return null;
  try {
    const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
    const codes = await detector.detect(canvas);
    const raw = codes[0]?.rawValue?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

async function decodeWithJsQr(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { default: jsQR } = await import("jsqr");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data?.trim() ?? null;
}

export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  canvas.width = Math.floor(img.naturalWidth * scale);
  canvas.height = Math.floor(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const native = await decodeWithBarcodeDetector(canvas);
  if (native) return native;
  return decodeWithJsQr(canvas);
}
