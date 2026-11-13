import { Browser, BrowserContext, test as base, expect, Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { ApiHelper, Role, RolePolicy, TestAccount, uniqueClientIp } from './api';
import { ACCOUNTS_FILE, BASE_URL, LANGUAGE_STORAGE_KEY, TOKEN_STORAGE_KEY } from './env';
import { routeApi } from './route-api';

interface Fixtures {
  /** Client address of this test, sent as X-Forwarded-For on every API request. */
  clientIp: string;
  /** API helper authenticated with the admin token of the setup project. */
  api: ApiHelper;
  /**
   * Role policies to restore after the test: `remember(role)` reads the policy
   * before the test changes it; the fixture teardown saves it back, even when
   * the test fails or times out.
   */
  policies: { remember: (role: Exclude<Role, 'admin'>) => Promise<RolePolicy> };
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
    await prepareContext(context, clientIp);
    await use(context);
  },
  api: async ({ clientIp }, use) => {
    const api = await ApiHelper.create(undefined, clientIp);
    await use(api);
    await api.dispose();
  },
  // eslint-disable-next-line no-empty-pattern
  policies: async ({}, use) => {
    const remembered = new Map<Role, RolePolicy>();
    await use({
      remember: async role => {
        const api = await ApiHelper.create();
        try {
          const policy = await api.getRolePolicy(role);
          if (!remembered.has(role)) remembered.set(role, policy);
          return policy;
        } finally {
          await api.dispose();
        }
      },
    });
    if (remembered.size === 0) return;
    // A helper of its own: the test's request contexts may be closed after a timeout.
    const api = await ApiHelper.create();
    try {
      for (const policy of remembered.values()) {
        await api.saveRolePolicy(policy.role, {
          active: policy.active,
          permissions: policy.permissions,
        });
      }
    } finally {
      await api.dispose();
    }
  },
});

export { expect };

/**
 * Gives a browser context its client address (X-Forwarded-For on every API
 * request) and forces English before any page script runs.
 */
async function prepareContext(context: BrowserContext, clientIp: string): Promise<void> {
  await routeApi(context, clientIp);
  await context.addInitScript(key => window.localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
}

/**
 * A second, logged-out browser session with its own client address, for a
 * test that needs another user next to the admin page. Close its context.
 */
export async function newGuestPage(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    locale: 'en-US',
    timezoneId: 'Africa/Nairobi',
    storageState: { cookies: [], origins: [] },
  });
  await prepareContext(context, uniqueClientIp());
  return { context, page: await context.newPage() };
}

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
