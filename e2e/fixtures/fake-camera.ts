import { Page } from '@playwright/test';

/**
 * Replaces navigator.mediaDevices.getUserMedia with a canvas stream that shows
 * the given image (for example a badge QR code).
 * Stub: completed by the flows that use the camera (F3.6, F7).
 */
export async function installFakeCamera(_page: Page, _imageDataUrl: string): Promise<void> {
  throw new Error('installFakeCamera is not implemented yet (completed with flows F3.6 and F7).');
}
