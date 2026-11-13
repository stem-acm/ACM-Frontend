import { test as base, expect, Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { ApiHelper, Role, TestAccount } from './api';
import { ACCOUNTS_FILE, LANGUAGE_STORAGE_KEY, TOKEN_STORAGE_KEY } from './env';

interface Fixtures {
  /** API helper authenticated with the admin token of the setup project. */
  api: ApiHelper;
}

/**
 * Base test of every spec: forces English before any page script runs
 * (only the language flow switches language) and exposes the API helper.
 */
export const test = base.extend<Fixtures>({
  context: async ({ context }, use) => {
    await context.addInitScript(
      key => window.localStorage.setItem(key, 'en'),
      LANGUAGE_STORAGE_KEY,
    );
    await use(context);
  },
  // eslint-disable-next-line no-empty-pattern
  api: async ({}, use) => {
    const api = await ApiHelper.create();
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
