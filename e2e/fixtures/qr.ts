import { ApiHelper } from './api';

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

/**
 * Renders a QR payload as a PNG data URL for the fake camera.
 * Stub: completed by the flows that scan badges (F7).
 */
export async function qrImageDataUrl(_payload: QrPayload | string): Promise<string> {
  throw new Error('qrImageDataUrl is not implemented yet (completed with flow F7).');
}
