import { test as base, expect, Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { ApiHelper, Role, TestAccount, uniqueClientIp } from './api';
import { ACCOUNTS_FILE, API_URL, LANGUAGE_STORAGE_KEY, TOKEN_STORAGE_KEY } from './env';

interface Fixtures {
  /** Client address of this test, sent as X-Forwarded-For on every API request. */
  clientIp: string;
  /** API helper authenticated with the admin token of the setup project. */
  api: ApiHelper;
}

/**
 * Base test of every spec: forces English before any page script runs
 * (only the language flow switches language), gives the test its own client
 * address for the API rate limiters and exposes the API helper.
 */
export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  clientIp: async ({}, use) => {
    await use(uniqueClientIp());
  },
  context: async ({ context, clientIp }, use) => {
    // route.continue does not buffer the response, so the SSE stream keeps streaming.
    await context.route(`${new URL(API_URL).origin}/**`, route =>
      route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': clientIp } }),
    );
    await context.addInitScript(
      key => window.localStorage.setItem(key, 'en'),
      LANGUAGE_STORAGE_KEY,
    );
    await use(context);
  },
  api: async ({ clientIp }, use) => {
    const api = await ApiHelper.create(undefined, clientIp);
    await use(api);
    await api.dispose();
  },
});

export { expect };

/** Accounts created by the setup project, by role. */
export function readAccounts(): Record<Exclude<Role, 'admin'>, TestAccount> {
  if (!existsSync(ACCOUNTS_FILE)) {
    throw new Error(`${ACCOUNTS_FILE} not found. Run the setup project first.`);
  }
  return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8'));
}

/** Fills and submits the login form on /auth. */
export async function loginThroughUi(page: Page, username: string, password: string) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function readToken(page: Page): Promise<string | null> {
  return page.evaluate(key => window.localStorage.getItem(key), TOKEN_STORAGE_KEY);
}
