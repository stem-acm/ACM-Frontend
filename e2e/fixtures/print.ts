import { Page } from '@playwright/test';

/**
 * Replaces window.print with a stub that counts its calls, before any page
 * script runs. The stub also covers the windows of iframes: an app that prints
 * through a hidden iframe calls print() on that iframe's window.
 */
export async function stubPrint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const top = window as unknown as { e2ePrintCalls: number };
    top.e2ePrintCalls = 0;
    const stub = () => {
      top.e2ePrintCalls += 1;
    };
    window.print = stub;
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      'contentWindow',
    );
    const getter = descriptor?.get;
    if (!descriptor || !getter) return;
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      ...descriptor,
      get(this: HTMLIFrameElement) {
        const frameWindow = getter.call(this) as Window | null;
        if (frameWindow) frameWindow.print = stub;
        return frameWindow;
      },
    });
  });
}

/** Number of print() calls since the page was opened. */
export async function printCalls(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { e2ePrintCalls: number }).e2ePrintCalls);
}
