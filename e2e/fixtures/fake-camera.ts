import { Page } from '@playwright/test';

/** Size of the fake camera frame and of the square the image may fill (80%). */
export const FAKE_CAMERA_FRAME = { width: 640, height: 480, room: 384 } as const;

/**
 * Replaces navigator.mediaDevices.getUserMedia with a canvas stream that shows
 * the given image (for example a member photo or a badge QR code).
 * Call it before the page is opened: it is an init script.
 */
export async function installFakeCamera(
  page: Page,
  imageDataUrl: string,
  options: { motion?: boolean } = {},
): Promise<void> {
  await page.addInitScript(
    ({ dataUrl, frame, motion }) => {
      const fakeGetUserMedia = async (): Promise<MediaStream> => {
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = frame.width;
        canvas.height = frame.height;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        // The image fills at most 80% of the frame. It is scaled by a whole factor
        // when possible, without smoothing, so that a QR code keeps sharp modules.
        const room = frame.room;
        const side = Math.max(image.naturalWidth, image.naturalHeight);
        const factor = side <= room ? Math.floor(room / side) : room / side;
        const width = image.naturalWidth * factor;
        const height = image.naturalHeight * factor;
        let frameNumber = 0;
        const draw = () => {
          context.imageSmoothingEnabled = false;
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.save();
          context.translate(canvas.width / 2, canvas.height / 2);
          // A handheld badge moves slightly. Still, axis-aligned frames trigger
          // known finder-pattern failures in ZXing for some otherwise valid QRs.
          if (motion) {
            const angles = [-3, 0, 3];
            context.rotate((angles[frameNumber++ % angles.length] * Math.PI) / 180);
          }
          context.drawImage(image, Math.round(-width / 2), Math.round(-height / 2), width, height);
          context.restore();
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
      // Scanners list the video inputs first; a headless browser may have none.
      const fakeCamera = {
        deviceId: 'e2e-fake-camera',
        groupId: 'e2e',
        kind: 'videoinput',
        label: 'E2e fake camera (user)',
        toJSON() {
          return this;
        },
      } as MediaDeviceInfo;
      Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
        value: async () => [fakeCamera],
        configurable: true,
      });
    },
    { dataUrl: imageDataUrl, frame: FAKE_CAMERA_FRAME, motion: options.motion ?? false },
  );
}
