import { Page } from '@playwright/test';
import { FEATURE_LABELS, ROLE_LABELS, expectNavbarFollows, navbar } from './fixtures/access';
import {
  ApiHelper,
  Role,
  RolePolicy,
  TestAccount,
  generatePassword,
  uniqueSuffix,
} from './fixtures/api';
import { ADMIN, BASE_URL } from './fixtures/env';
import { expect, loginThroughUi, newGuestPage, readToken, test } from './fixtures/test';

const SETTINGS_URL = `${BASE_URL}/setting`;
const AUTH_URL = `${BASE_URL}/auth`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The "Role permissions" card. The sections have no accessible name: located
 * by their heading.
 */
function rolesSection(page: Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Role permissions' }) });
}

/** A role tab; its name gains "Unsaved changes" while the role is dirty. */
function roleTab(page: Page, role: Role) {
  // The tabs carry role="tab", but the z-button directive turns it into "button".
  return page
    .getByRole('tablist')
    .getByRole('button', { name: new RegExp(`^${escapeRegExp(ROLE_LABELS[role])}`) });
}

/** The active/inactive switch of the selected role. */
function roleActiveSwitch(page: Page) {
  return rolesSection(page).getByRole('checkbox', { name: /^(Active|Inactive)$/ });
}

/**
 * The checkbox of a feature. The labels repeat across groups ("View",
 * "Create"…) and the groups have no accessible role: the group is located by
 * its container class and its heading.
 */
function featureBox(page: Page, feature: string) {
  const { group, label } = FEATURE_LABELS[feature];
  return rolesSection(page)
    .locator('.access-group')
    .filter({ has: page.getByRole('heading', { name: group, exact: true, level: 3 }) })
    .getByRole('checkbox', { name: label, exact: true });
}

function savePermissionsButton(page: Page) {
  return page.getByRole('button', { name: 'Save permissions' });
}

function accessUpdated(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Access updated' });
}

function unsavedNote(page: Page) {
  return rolesSection(page).getByRole('status').filter({ hasText: 'Unsaved changes' });
}

/** The row of an account in the accounts table. */
function accountRow(page: Page, username: string) {
  return page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: username, exact: true }) });
}

/** The "Add account" form has no accessible name: located by its heading. */
function createForm(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: 'Add account' }) });
}

async function openRole(page: Page, role: Role) {
  await page.goto('/setting');
  await roleTab(page, role).click();
  await expect(roleTab(page, role)).toHaveAttribute('aria-selected', 'true');
  await expect(roleActiveSwitch(page)).toBeVisible();
}

async function restorePolicy(api: ApiHelper, original: RolePolicy) {
  await api.saveRolePolicy(original.role, {
    active: original.active,
    permissions: original.permissions,
  });
}

async function permissionsOf(api: ApiHelper, role: Role): Promise<Record<string, boolean>> {
  return (await api.getRolePolicy(role)).permissions;
}

/** Deactivates test accounts at the end of a test (users cannot be deleted). */
async function deactivate(api: ApiHelper, accounts: { id: number; role: Role }[]) {
  for (const account of accounts) {
    await api.updateUser(account.id, { role: account.role, active: false });
  }
}

test.describe('F11 Settings', () => {
  test('F11.1 role tabs admin / intern / volunteer show each role policy equal to the API', async ({
    page,
    api,
  }) => {
    const policies = await api.getRolePolicies();
    expect(policies.map(policy => policy.role).sort()).toEqual(['admin', 'intern', 'volunteer']);

    await page.goto('/setting');
    for (const policy of policies) {
      expect(Object.keys(policy.permissions).sort(), `features of ${policy.role}`).toEqual(
        Object.keys(FEATURE_LABELS).sort(),
      );
      await roleTab(page, policy.role).click();
      await expect(roleTab(page, policy.role)).toHaveAttribute('aria-selected', 'true');
      await expect(roleActiveSwitch(page)).toBeChecked({ checked: policy.active });
      for (const [feature, allowed] of Object.entries(policy.permissions)) {
        await expect(featureBox(page, feature), `${policy.role} ${feature}`).toBeChecked({
          checked: allowed,
        });
      }
    }
  });

  test('F11.2 removing a feature from intern and saving turns it off in the API', async ({
    page,
    api,
    policies,
  }) => {
    const original = await policies.remember('intern');
    expect(original.permissions['members.cards'], 'intern has members.cards before').toBe(true);
    try {
      await openRole(page, 'intern');
      await featureBox(page, 'members.cards').uncheck();
      await savePermissionsButton(page).click();

      await expect(accessUpdated(page)).toBeVisible();
      await expect
        .poll(async () => (await permissionsOf(api, 'intern'))['members.cards'])
        .toBe(false);
    } finally {
      await restorePolicy(api, original);
    }
  });

  test('F11.3 granting members.cards to a role without members.view saves both', async ({
    page,
    api,
    policies,
  }) => {
    const original = await policies.remember('volunteer');
    try {
      await api.saveRolePolicy('volunteer', {
        active: original.active,
        permissions: { ...original.permissions, 'members.view': false, 'members.cards': false },
      });
      await openRole(page, 'volunteer');
      await expect(featureBox(page, 'members.view')).not.toBeChecked();
      await featureBox(page, 'members.cards').check();
      await savePermissionsButton(page).click();

      await expect(accessUpdated(page)).toBeVisible();
      await expect
        .poll(async () => {
          const permissions = await permissionsOf(api, 'volunteer');
          return {
            'members.cards': permissions['members.cards'],
            'members.view': permissions['members.view'],
          };
        })
        .toEqual({ 'members.cards': true, 'members.view': true });
    } finally {
      await restorePolicy(api, original);
    }
  });

  test('F11.4 granting volunteers.certificate, checkins.create and books.create saves their view features', async ({
    page,
    api,
    policies,
  }) => {
    const original = await policies.remember('volunteer');
    try {
      await api.saveRolePolicy('volunteer', {
        active: original.active,
        permissions: {
          ...original.permissions,
          'volunteers.view': false,
          'volunteers.certificate': false,
          'activities.view': false,
          'checkins.create': false,
          'books.view': false,
          'books.create': false,
          'books.update': false,
        },
      });
      await openRole(page, 'volunteer');
      for (const feature of ['volunteers.view', 'activities.view', 'books.view']) {
        await expect(featureBox(page, feature), feature).not.toBeChecked();
      }
      await featureBox(page, 'volunteers.certificate').check();
      await featureBox(page, 'checkins.create').check();
      await featureBox(page, 'books.create').check();
      await savePermissionsButton(page).click();

      await expect(accessUpdated(page)).toBeVisible();
      await expect
        .poll(async () => {
          const permissions = await permissionsOf(api, 'volunteer');
          return Object.fromEntries(
            [
              'volunteers.certificate',
              'volunteers.view',
              'checkins.create',
              'activities.view',
              'books.create',
              'books.view',
            ].map(feature => [feature, permissions[feature]]),
          );
        })
        .toEqual({
          'volunteers.certificate': true,
          'volunteers.view': true,
          'checkins.create': true,
          'activities.view': true,
          'books.create': true,
          'books.view': true,
        });
    } finally {
      await restorePolicy(api, original);
    }
  });

  test('F11.5 the admin role cannot be deactivated and always keeps settings.manage', async ({
    page,
    api,
  }) => {
    await openRole(page, 'admin');
    await expect(roleActiveSwitch(page)).toBeChecked();
    await expect(roleActiveSwitch(page)).toBeDisabled();
    await expect(featureBox(page, 'settings.manage')).toBeChecked();
    await expect(featureBox(page, 'settings.manage')).toBeDisabled();
    await expect(
      page.getByText('Admin stays active so Settings remains accessible.', { exact: true }),
    ).toBeVisible();

    // Refused by the API before anything is written.
    const refused = await api.putRaw('settings/roles/admin', { active: false, permissions: {} });
    expect(refused).toEqual({ status: 400, message: 'Admin role must remain active' });

    const admin = await api.getRolePolicy('admin');
    expect(admin.active).toBe(true);
    expect(admin.permissions['settings.manage']).toBe(true);
  });

  test('F11.6 creating a user account lists it and that user can log in', async ({
    page,
    api,
    browser,
  }) => {
    const username = `e2ecreated${uniqueSuffix()}`;
    const email = `${username}@e2e.test`;
    const password = generatePassword();
    try {
      await page.goto('/setting');
      const form = createForm(page);
      await form.getByLabel('Username').fill(username);
      await form.getByLabel('Email').fill(email);
      await form.getByLabel('Password').fill(password);
      await form.getByLabel('Role').selectOption({ label: 'Volunteer' });
      await form.getByRole('button', { name: 'Create account' }).click();

      await expect(form.getByRole('status').filter({ hasText: 'Account created' })).toBeVisible();
      await expect(accountRow(page, username)).toBeVisible();
      await expect.poll(async () => (await api.getUserByName(username))?.role).toBe('volunteer');
      expect(await api.getUserByName(username)).toMatchObject({
        username,
        email,
        role: 'volunteer',
        active: true,
      });

      const guest = await newGuestPage(browser);
      try {
        await guest.page.goto('/auth');
        await loginThroughUi(guest.page, username, password);
        await expect(guest.page).toHaveURL(`${BASE_URL}/`);
        expect(await readToken(guest.page)).toBeTruthy();
      } finally {
        await guest.context.close();
      }
    } finally {
      const user = await api.getUserByName(username);
      if (user) await deactivate(api, [user]);
    }
  });

  test('F11.7 creating an account with an existing username is refused with a message and no duplicate', async ({
    page,
    api,
  }) => {
    const existing = await api.createUser('volunteer');
    try {
      await page.goto('/setting');
      const form = createForm(page);
      await form.getByLabel('Username').fill(existing.username);
      await form.getByLabel('Email').fill(`other${uniqueSuffix()}@e2e.test`);
      await form.getByLabel('Password').fill(generatePassword());
      await form.getByRole('button', { name: 'Create account' }).click();

      const error = form.getByRole('alert');
      await expect(error).toBeVisible();
      await expect(error).toContainText('already exists');
      await expect(form.getByRole('status').filter({ hasText: 'Account created' })).toHaveCount(0);

      const users = await api.getUsers();
      expect(users.filter(user => user.username === existing.username)).toHaveLength(1);
      await expect(accountRow(page, existing.username)).toHaveCount(1);
    } finally {
      await deactivate(api, [existing]);
    }
  });

  test("F11.8 changing a user's role saves it in the API and the user's permissions follow at the next login", async ({
    page,
    api,
    browser,
  }) => {
    const user: TestAccount = await api.createUser('volunteer');
    const intern = await api.getRolePolicy('intern');
    const volunteer = await api.getRolePolicy('volunteer');
    expect(intern.permissions, 'intern and volunteer policies differ').not.toEqual(
      volunteer.permissions,
    );
    try {
      await page.goto('/setting');
      const row = accountRow(page, user.username);
      await row.getByRole('combobox').selectOption({ label: 'Intern' });
      await row.getByRole('button', { name: 'Save' }).click();

      await expect(accessUpdated(page)).toBeVisible();
      await expect.poll(async () => (await api.getUserByName(user.username))?.role).toBe('intern');

      const guest = await newGuestPage(browser);
      try {
        await guest.page.goto('/auth');
        await loginThroughUi(guest.page, user.username, user.password);
        await expect(guest.page).not.toHaveURL(AUTH_URL);
        await expect(navbar(guest.page)).toBeVisible();
        await expectNavbarFollows(guest.page, intern.permissions);
      } finally {
        await guest.context.close();
      }
    } finally {
      await deactivate(api, [{ id: user.id, role: 'intern' }]);
    }
  });

  test('F11.9 a user deactivated in the settings cannot log in', async ({ page, api, browser }) => {
    const user = await api.createUser('volunteer');
    try {
      await page.goto('/setting');
      const row = accountRow(page, user.username);
      await row.getByRole('checkbox').uncheck();
      await row.getByRole('button', { name: 'Save' }).click();

      await expect(accessUpdated(page)).toBeVisible();
      await expect.poll(async () => (await api.getUserByName(user.username))?.active).toBe(false);

      const guest = await newGuestPage(browser);
      try {
        await guest.page.goto('/auth');
        await loginThroughUi(guest.page, user.username, user.password);
        const error = guest.page.getByRole('main').getByRole('alert');
        await expect(error).toBeVisible();
        await expect(error).not.toBeEmpty();
        await expect(guest.page).toHaveURL(AUTH_URL);
        expect(await readToken(guest.page)).toBeNull();
      } finally {
        await guest.context.close();
      }
    } finally {
      await deactivate(api, [user]);
    }
  });

  test('F11.10 the admin cannot remove their own admin role or deactivate themself', async ({
    page,
    api,
  }) => {
    const admin = await api.getUserByName(ADMIN.username);
    expect(admin).toMatchObject({ role: 'admin', active: true });

    await page.goto('/setting');
    const row = accountRow(page, ADMIN.username);
    await expect(row.getByRole('combobox')).toBeDisabled();
    await expect(row.getByRole('checkbox')).toBeDisabled();

    // Refused by the API before anything is written.
    const roleChange = await api.putRaw(`settings/users/${admin!.id}`, {
      role: 'intern',
      active: true,
    });
    expect(roleChange).toEqual({ status: 400, message: 'You cannot remove your own admin access' });
    const deactivation = await api.putRaw(`settings/users/${admin!.id}`, {
      role: 'admin',
      active: false,
    });
    expect(deactivation).toEqual({
      status: 400,
      message: 'You cannot remove your own admin access',
    });

    expect(await api.getUserByName(ADMIN.username)).toEqual(admin);
  });

  test('F11.11 an unsaved policy change asks for confirmation before leaving the page', async ({
    page,
    api,
    policies,
  }) => {
    const original = await policies.remember('intern');
    expect(original.permissions['members.cards'], 'intern has members.cards before').toBe(true);
    try {
      await openRole(page, 'intern');
      await featureBox(page, 'members.cards').uncheck();
      await expect(unsavedNote(page)).toBeVisible();

      const members = navbar(page).getByRole('button', { name: 'Members', exact: true });
      // The confirm dialog blocks the click until it is answered: answer it in a handler.
      const dialogs: { type: string; message: string }[] = [];
      page.once('dialog', dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        void dialog.dismiss();
      });
      await members.click();
      await expect
        .poll(() => dialogs)
        .toEqual([
          {
            type: 'confirm',
            message: 'You have unsaved permission changes. Leave this page and discard them?',
          },
        ]);

      await expect(page).toHaveURL(SETTINGS_URL);
      await expect(featureBox(page, 'members.cards')).not.toBeChecked();
      await expect(unsavedNote(page)).toBeVisible();

      page.once('dialog', dialog => {
        dialogs.push({ type: dialog.type(), message: dialog.message() });
        void dialog.accept();
      });
      await members.click();
      await expect.poll(() => dialogs.length).toBe(2);
      expect(dialogs[1].type).toBe('confirm');

      await expect(page).toHaveURL(`${BASE_URL}/members`);
      expect(await api.getRolePolicy('intern')).toEqual(original);
    } finally {
      await restorePolicy(api, original);
    }
  });
});
