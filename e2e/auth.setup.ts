import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ApiHelper } from './fixtures/api';
import { ACCOUNTS_FILE, ADMIN, ADMIN_STORAGE_STATE, BASE_URL } from './fixtures/env';
import { expect, loginThroughUi, readToken, test as setup } from './fixtures/test';

setup('log in as admin and create the intern and volunteer accounts', async ({ page }) => {
  await page.goto('/auth');
  await loginThroughUi(page, ADMIN.username, ADMIN.password);
  await expect(page).toHaveURL(`${BASE_URL}/`);

  const token = await readToken(page);
  expect(token, 'admin token in localStorage').toBeTruthy();

  mkdirSync(dirname(ADMIN_STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });

  const api = await ApiHelper.create(token as string);
  try {
    const intern = await api.createUser('intern');
    const volunteer = await api.createUser('volunteer');
    writeFileSync(ACCOUNTS_FILE, JSON.stringify({ intern, volunteer }, null, 2));
  } finally {
    await api.dispose();
  }
});
