import { BrowserContext } from '@playwright/test';
import { API_ORIGIN, APP_API_ORIGIN } from './env';

/**
 * Sends every API request of the browser (calls, uploads, SSE streams) to the
 * throwaway API of the tests, with the client address of the test as
 * X-Forwarded-For for the API rate limiters.
 */
export async function routeApi(context: BrowserContext, clientIp: string): Promise<void> {
  // route.continue does not buffer the response, so the SSE stream keeps streaming.
  await context.route(`${APP_API_ORIGIN}/**`, route => {
    const request = route.request();
    return route.continue({
      url: API_ORIGIN + request.url().slice(APP_API_ORIGIN.length),
      headers: { ...request.headers(), 'x-forwarded-for': clientIp },
    });
  });
}
