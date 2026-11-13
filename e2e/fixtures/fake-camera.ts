import { Page } from '@playwright/test';

/**
 * Replaces navigator.mediaDevices.getUserMedia with a canvas stream that shows
 * the given image (for example a member photo or a badge QR code).
 * Call it before the page is opened: it is an init script.
 */
export async function installFakeCamera(page: Page, imageDataUrl: string): Promise<void> {
  await page.addInitScript(dataUrl => {
    const fakeGetUserMedia = async (): Promise<MediaStream> => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext('2d') as CanvasRenderingContext2D;
      const draw = () => {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const size = Math.min(canvas.width, canvas.height) * 0.8;
        context.drawImage(image, (canvas.width - size) / 2, (canvas.height - size) / 2, size, size);
      };
      draw();
      // A canvas stream only emits frames when the canvas is painted again.
      window.setInterval(draw, 100);
      return canvas.captureStream(10);
    };
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: fakeGetUserMedia,
      configurable: true,
    });
  }, imageDataUrl);
}
