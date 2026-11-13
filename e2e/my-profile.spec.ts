import { Page } from '@playwright/test';
import { navbar } from './fixtures/access';
import { apiLogin, generatePassword, TestAccount, uniqueSuffix } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { expect, loginThroughUi, test } from './fixtures/test';

const PROFILE_URL = `${BASE_URL}/my-profile`;
const PASSWORD_RULES = 'Use at least 8 characters, including a letter and a number.';

/** The profile cards have no accessible name: located by their heading. */
function detailsCard(page: Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Account details', level: 2 }) });
}

function passwordCard(page: Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Change password', level: 2 }) });
}

/** Logs in with the account through /auth and opens /my-profile. */
async function openMyProfile(page: Page, account: TestAccount) {
  await page.goto('/auth');
  await loginThroughUi(page, account.username, account.password);
  await expect(page).not.toHaveURL(`${BASE_URL}/auth`);
  await page.goto('/my-profile');
  await expect(page).toHaveURL(PROFILE_URL);
  await expect(detailsCard(page).getByLabel('Username')).toHaveValue(account.username);
}

test.describe('F13 My profile', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let account: TestAccount;

  test.beforeEach(async ({ api }) => {
    account = await api.createUser('volunteer', 'e2eprofile');
  });

  test.afterEach(async ({ api }) => {
    // Users cannot be deleted: the test account is left deactivated.
    await api.updateUser(account.id, { role: account.role, active: false });
  });

  test('F13.1 changing username and email with the current password saves them in the navbar and the API', async ({
    page,
    api,
  }) => {
    const username = `e2erenamed${uniqueSuffix()}`;
    const email = `${username}@e2e.test`;
    await openMyProfile(page, account);

    const card = detailsCard(page);
    await card.getByLabel('Username').fill(username);
    await card.getByLabel('Email').fill(email);
    await card.getByLabel('Current password').fill(account.password);
    await card.getByRole('button', { name: 'Save details' }).click();

    await expect(card.getByRole('status')).toHaveText('Account details updated.');
    const nav = navbar(page);
    await nav.getByRole('button', { name: 'Open user menu' }).click();
    await expect(nav.getByText(username, { exact: true })).toBeVisible();
    await expect(nav.getByText(email, { exact: true })).toBeVisible();

    const users = await api.getUsers();
    expect(users.find(user => user.id === account.id)).toMatchObject({ username, email });
    expect(users.some(user => user.username === account.username)).toBe(false);
  });

  test('F13.2 a wrong current password is refused with a message and nothing changes', async ({
    page,
    api,
  }) => {
    const before = (await api.getUsers()).find(user => user.id === account.id);
    await openMyProfile(page, account);

    const card = detailsCard(page);
    await card.getByLabel('Username').fill(`e2ewrong${uniqueSuffix()}`);
    await card.getByLabel('Email').fill(`e2ewrong${uniqueSuffix()}@e2e.test`);
    await card.getByLabel('Current password').fill(`wrong-${generatePassword()}`);
    await card.getByRole('button', { name: 'Save details' }).click();

    await expect(card.getByRole('alert')).toHaveText('Current password is incorrect.');
    await expect(card.getByRole('status')).toHaveCount(0);
    expect((await api.getUsers()).find(user => user.id === account.id)).toEqual(before);
  });

  test('F13.3 after a valid password change the old password no longer logs in and the new one does', async ({
    page,
  }) => {
    const newPassword = generatePassword();
    await openMyProfile(page, account);

    const card = passwordCard(page);
    await card.getByLabel('Current password').fill(account.password);
    await card.getByLabel(/^New password/).fill(newPassword);
    await card.getByLabel('Confirm new password').fill(newPassword);
    await card.getByRole('button', { name: 'Change password' }).click();

    await expect(card.getByRole('status')).toHaveText('Password updated.');
    const oldLogin = await apiLogin(account.username, account.password);
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.token).toBeNull();
    const newLogin = await apiLogin(account.username, newPassword);
    expect(newLogin.status).toBe(200);
    expect(newLogin.token).toBeTruthy();
  });

  test('F13.4 a too weak new password is refused with a message and the old password stays valid', async ({
    page,
  }) => {
    const weak = 'onlyletters';
    await openMyProfile(page, account);

    const card = passwordCard(page);
    await card.getByLabel('Current password').fill(account.password);
    const newPasswordField = card.getByLabel(/^New password/);
    await newPasswordField.fill(weak);
    await card.getByLabel('Confirm new password').fill(weak);

    // The field message (the hint below the form has the same text).
    await expect(
      card
        .locator('label')
        .filter({ hasText: /^New password/ })
        .getByText(PASSWORD_RULES, { exact: true }),
    ).toBeVisible();
    await expect(newPasswordField).toHaveAttribute('aria-invalid', 'true');
    await expect(card.getByRole('button', { name: 'Change password' })).toBeDisabled();
    await expect(card.getByRole('status')).toHaveCount(0);

    const oldLogin = await apiLogin(account.username, account.password);
    expect(oldLogin.status).toBe(200);
    expect(oldLogin.token).toBeTruthy();
    expect((await apiLogin(account.username, weak)).status).toBe(401);
  });
});
