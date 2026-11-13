import { ADMIN, BASE_URL } from './fixtures/env';
import { expect, loginThroughUi, readToken, test } from './fixtures/test';

const AUTH_URL = `${BASE_URL}/auth`;
const HOME_URL = `${BASE_URL}/`;

test.describe('F1 Authentication — guest', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('F1.1 admin logs in with valid credentials and lands on / with the user in the navbar', async ({
    page,
  }) => {
    await page.goto('/auth');
    await loginThroughUi(page, ADMIN.username, ADMIN.password);

    await expect(page).toHaveURL(HOME_URL);
    const navbar = page.getByRole('navigation', { name: 'Main navigation' });
    await navbar.getByRole('button', { name: 'Open user menu' }).click();
    await expect(navbar.getByText(ADMIN.username, { exact: true })).toBeVisible();
  });

  test('F1.2 wrong password keeps the user on /auth with an error and no token', async ({
    page,
  }) => {
    await page.goto('/auth');
    await loginThroughUi(page, ADMIN.username, `wrong-${Date.now()}`);

    const error = page.getByRole('main').getByRole('alert');
    await expect(error).toBeVisible();
    await expect(error).not.toBeEmpty();
    await expect(page).toHaveURL(AUTH_URL);
    expect(await readToken(page)).toBeNull();
  });

  test('F1.3 a user deactivated by an admin cannot log in', async ({ page, api }) => {
    const user = await api.createUser('volunteer');
    await api.updateUser(user.id, { role: user.role, active: false });

    await page.goto('/auth');
    await loginThroughUi(page, user.username, user.password);

    const error = page.getByRole('main').getByRole('alert');
    await expect(error).toBeVisible();
    await expect(error).not.toBeEmpty();
    await expect(page).toHaveURL(AUTH_URL);
    expect(await readToken(page)).toBeNull();
  });

  test('F1.4 a user whose role is deactivated cannot log in', async ({ page, api }) => {
    const user = await api.createUser('intern');
    const original = await api.getRolePolicy('intern');
    await api.saveRolePolicy('intern', { active: false, permissions: original.permissions });
    try {
      await page.goto('/auth');
      await loginThroughUi(page, user.username, user.password);

      const error = page.getByRole('main').getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).not.toBeEmpty();
      await expect(page).toHaveURL(AUTH_URL);
      expect(await readToken(page)).toBeNull();
    } finally {
      await api.saveRolePolicy('intern', {
        active: original.active,
        permissions: original.permissions,
      });
    }
  });

  test('F1.6 a guest opening /members is redirected to /auth', async ({ page }) => {
    await page.goto('/members');

    await expect(page).toHaveURL(AUTH_URL);
  });
});

test.describe('F1 Authentication — logged in as admin', () => {
  test('F1.5 logout from the navbar goes to /auth, removes the token and protects /members', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(HOME_URL);
    const navbar = page.getByRole('navigation', { name: 'Main navigation' });
    await navbar.getByRole('button', { name: 'Open user menu' }).click();
    await navbar.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(AUTH_URL);
    expect(await readToken(page)).toBeNull();

    await page.goto('/members');
    await expect(page).toHaveURL(AUTH_URL);
  });

  test('F1.7 a logged-in user opening /auth is redirected to the first allowed route', async ({
    page,
  }) => {
    await page.goto('/auth');

    await expect(page).toHaveURL(HOME_URL);
  });

  test('F1.8 an invalid token in localStorage logs the user out at the next navigation', async ({
    page,
  }) => {
    await page.goto('/');
    const navbar = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(navbar).toBeVisible();

    await page.evaluate(() => window.localStorage.setItem('token', 'invalid-token'));
    // The menu entries are anchors rendered with the z-button directive (role "button").
    await navbar.getByRole('button', { name: 'Members', exact: true }).click();

    await expect(page).toHaveURL(AUTH_URL);
    expect(await readToken(page)).toBeNull();
  });
});
