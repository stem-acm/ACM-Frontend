import {
  BinaryBitmap,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { create, QRCode as QrSymbol, QRCodeMaskPattern, toDataURL } from 'qrcode';
import { ApiHelper } from './api';
import { FAKE_CAMERA_FRAME } from './fake-camera';

/** Content of a member badge QR code: the JSON the scanner reads. */
export interface QrPayload {
  registrationNumber: number;
  signature: string;
}

/** GET /api/members/registration/:n/qr-code with the admin token. */
export async function fetchQrPayload(
  api: ApiHelper,
  registrationNumber: number,
): Promise<QrPayload> {
  return api.get<QrPayload>(`members/registration/${registrationNumber}/qr-code`);
}

/** Quiet zone around the symbol, in modules (the standard minimum). */
const MARGIN = 4;
const MASK_PATTERNS: QRCodeMaskPattern[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** Whole pixels per module so that the symbol, quiet zone included, fits the fake camera. */
function moduleScale(symbolSize: number): number {
  return Math.floor(FAKE_CAMERA_FRAME.room / (symbolSize + 2 * MARGIN));
}

/**
 * Whether the app's scanner library (@zxing/library, as ScannerComponent uses
 * it: MultiFormatReader on a HybridBinarizer) reads the symbol from the frame
 * the fake camera paints: black modules on white, centred, at the given scale.
 */
function scannerReads(symbol: QrSymbol, text: string): boolean {
  const { width, height } = FAKE_CAMERA_FRAME;
  const size = symbol.modules.size;
  const scale = moduleScale(size);
  const side = (size + 2 * MARGIN) * scale;
  const left = Math.round((width - side) / 2) + MARGIN * scale;
  const top = Math.round((height - side) / 2) + MARGIN * scale;
  const luminance = new Uint8ClampedArray(width * height).fill(255);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!symbol.modules.get(row, col)) continue;
      for (let y = 0; y < scale; y++) {
        const start = (top + row * scale + y) * width + left + col * scale;
        luminance.fill(0, start, start + scale);
      }
    }
  }
  try {
    const bitmap = new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(luminance, width, height)),
    );
    return new MultiFormatReader().decode(bitmap).getText() === text;
  } catch {
    return false;
  }
}

/**
 * Renders a QR code as a PNG data URL for the fake camera: a payload object is
 * encoded as its JSON string (as on the badge), a string as is. Black on white,
 * standard quiet zone, whole pixels per module.
 *
 * The scanner library fails on some perfect, still symbols (a real camera
 * sends slightly different frames; the fake camera sends the same one), so
 * the mask pattern is the encoder's choice when the scanner library reads it,
 * otherwise the first one it reads.
 */
export async function qrImageDataUrl(payload: QrPayload | string): Promise<string> {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const errorCorrectionLevel = 'M';
  const candidates = [
    create(text, { errorCorrectionLevel }),
    ...MASK_PATTERNS.map(maskPattern => create(text, { errorCorrectionLevel, maskPattern })),
  ];
  const symbol = candidates.find(candidate => scannerReads(candidate, text));
  if (!symbol) {
    throw new Error(`No mask pattern gives a QR code the scanner library reads: ${text}`);
  }
  return toDataURL(text, {
    errorCorrectionLevel,
    maskPattern: symbol.maskPattern,
    margin: MARGIN,
    scale: moduleScale(symbol.modules.size),
    color: { dark: '#000000', light: '#ffffff' },
  });
}
