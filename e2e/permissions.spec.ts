import { Page } from '@playwright/test';
import { expectNavbarFollows, FEATURE_LABELS, navbar } from './fixtures/access';
import { ApiHelper, apiLogin, Member, TestAccount, uniqueSuffix } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { expect, loginThroughUi, readAccounts, test } from './fixtures/test';

const HOME_URL = `${BASE_URL}/`;
const AUTH_URL = `${BASE_URL}/auth`;

/** Default volunteer features (defaultPermissions('volunteer') in the vault). */
const VOLUNTEER_DEFAULT_FEATURES = [
  'dashboard.view',
  'members.view',
  'volunteers.view',
  'activities.view',
  'books.view',
  'checkins.create',
  'profile.edit',
];

function volunteerDefaultPermissions(): Record<string, boolean> {
  return Object.fromEntries(
    Object.keys(FEATURE_LABELS).map(feature => [
      feature,
      VOLUNTEER_DEFAULT_FEATURES.includes(feature),
    ]),
  );
}

/** Today's date in Africa/Nairobi (UTC+3), YYYY-MM-DD. */
function todayEat(): string {
  return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** The test member that keeps the loans of the tests (same as books.spec.ts). */
async function loanKeeper(api: ApiHelper): Promise<Member> {
  const { data } = await api.getPage<Member>('members?limit=100&search=Loankeeper');
  const existing = data.find(m => m.firstName === 'E2e' && m.lastName === 'Loankeeper');
  return existing ?? api.createMember({ firstName: 'E2e', lastName: 'Loankeeper' });
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

/** "LASTNAME Firstname", as the members table writes the member. */
function memberRow(page: Page, member: Member) {
  return bodyRows(page).filter({
    has: page
      .getByRole('rowheader')
      .filter({ hasText: `${(member.lastName ?? '').toUpperCase()} ${member.firstName}` }),
  });
}

function activityRow(page: Page, name: string) {
  return bodyRows(page).filter({
    has: page.getByRole('rowheader').getByText(name, { exact: true }),
  });
}

function loanRow(page: Page, title: string) {
  return bodyRows(page).filter({ has: page.getByRole('cell', { name: title, exact: true }) });
}

/** Logs in through /auth and waits until the app has left the login page. */
async function login(page: Page, account: Pick<TestAccount, 'username' | 'password'>) {
  await page.goto('/auth');
  await loginThroughUi(page, account.username, account.password);
  await expect(page).not.toHaveURL(AUTH_URL);
  await expect(navbar(page)).toBeVisible();
}

/** Opens the members list filtered on the member, so its row is on the first page. */
async function openMembers(page: Page, member: Member) {
  await page.goto('/members');
  await page.getByRole('searchbox', { name: 'Search for members' }).fill(member.lastName ?? '');
  await expect(memberRow(page, member)).toBeVisible();
}

async function openActivities(page: Page, name: string) {
  await page.goto('/activity');
  await page.getByRole('searchbox', { name: 'Search for activities' }).fill(name);
  await expect(activityRow(page, name)).toBeVisible();
}

async function openProfile(page: Page, member: Member) {
  await page.goto(`/profil/${member.registrationNumber}`);
  await expect(page.getByText(member.lastName ?? '', { exact: false }).first()).toBeVisible();
}

test.describe('F12 Permissions', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('F12.1 volunteer with the default policy sees only the pages of its features, no Setting, no Cards', async ({
    page,
    api,
  }) => {
    const permissions = volunteerDefaultPermissions();
    expect(
      (await api.getRolePolicy('volunteer')).permissions,
      'volunteer policy is the default',
    ).toEqual(permissions);

    await login(page, readAccounts().volunteer);

    await expect(page).toHaveURL(HOME_URL);
    await expectNavbarFollows(page, permissions);
    await expect(navbar(page).getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
    await expect(navbar(page).getByRole('button', { name: 'Settings', exact: true })).toHaveCount(
      0,
    );
  });

  test('F12.2 volunteer opening /setting or /cards by URL is redirected to /', async ({ page }) => {
    await login(page, readAccounts().volunteer);

    await page.goto('/setting');
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByRole('heading', { name: 'Access settings' })).toHaveCount(0);

    await page.goto('/cards');
    await expect(page).toHaveURL(HOME_URL);
  });

  test('F12.3 intern has the create and edit buttons but no delete button on members and activities', async ({
    page,
    api,
  }) => {
    const member = await api.createMember();
    const activity = await api.createActivity();
    try {
      await login(page, readAccounts().intern);

      await openMembers(page, member);
      await expect(page.getByRole('button', { name: 'New Member' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      await openProfile(page, member);
      await expect(page.getByRole('button', { name: 'Edit Member' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      await openActivities(page, activity.name);
      await expect(page.getByRole('button', { name: 'New Activity' })).toBeVisible();
      await expect(
        activityRow(page, activity.name).getByRole('button', { name: 'Edit', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F12.4 volunteer has no create, edit or delete button on members, activities and book loans', async ({
    page,
    api,
  }) => {
    const member = await api.createMember();
    const activity = await api.createActivity();
    const title = `E2e permissions book ${uniqueSuffix()}`;
    const today = todayEat();
    // Loans cannot be deleted and block a member's deletion: the loan goes to the
    // shared loan keeper member of the book-loan tests.
    const keeper = await loanKeeper(api);
    const loan = await api.post<{ id: number }>('book-loans', {
      registrationNumber: keeper.registrationNumber,
      bookTitle: title,
      borrowingDate: today,
      expectedReturnDate: today,
      effectiveReturnDate: null,
    });
    try {
      await login(page, readAccounts().volunteer);

      await openMembers(page, member);
      await expect(page.getByRole('button', { name: 'New Member' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      await openProfile(page, member);
      await expect(page.getByRole('button', { name: 'Edit Member' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      await openActivities(page, activity.name);
      await expect(page.getByRole('button', { name: 'New Activity' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

      await page.goto('/book');
      await page.getByRole('searchbox', { name: 'Search book loans' }).fill(title);
      await expect(loanRow(page, title)).toBeVisible();
      await expect(page.getByRole('button', { name: 'New loan' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Mark as returned' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(Edit|Delete)$/ })).toHaveCount(0);
    } finally {
      await api.patch(`book-loans/${loan.id}/return`, { effectiveReturnDate: today });
      await api.deleteMemberIfExists(member.registrationNumber);
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F12.5 a role with dashboard.view off lands on /members after login', async ({
    page,
    api,
    policies,
  }) => {
    const user = await api.createUser('intern');
    const original = await policies.remember('intern');
    expect(original.permissions['members.view'], 'intern has members.view').toBe(true);
    try {
      await api.saveRolePolicy('intern', {
        active: original.active,
        permissions: { ...original.permissions, 'dashboard.view': false },
      });

      await page.goto('/auth');
      await loginThroughUi(page, user.username, user.password);

      await expect(page).toHaveURL(`${BASE_URL}/members`);
    } finally {
      await api.saveRolePolicy('intern', {
        active: original.active,
        permissions: original.permissions,
      });
      await api.updateUser(user.id, { role: user.role, active: false });
    }
  });

  test('F12.6 a direct API call with the volunteer token to DELETE /api/members/:id is refused with 403', async ({
    api,
  }) => {
    const volunteer = readAccounts().volunteer;
    const member = await api.createMember();
    try {
      const { status, token } = await apiLogin(volunteer.username, volunteer.password);
      expect(status).toBe(200);
      const asVolunteer = await ApiHelper.create(token as string);
      try {
        expect(await asVolunteer.deleteStatus(`members/${member.registrationNumber}`)).toBe(403);
      } finally {
        await asVolunteer.dispose();
      }
      expect(await api.status(`members/${member.registrationNumber}`)).toBe(200);
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
    }
  });

  test('F12.7 a feature removed from a role while its user is logged in is unreachable at the next navigation', async ({
    page,
    api,
    policies,
  }) => {
    const user = await api.createUser('intern');
    const original = await policies.remember('intern');
    expect(original.permissions['volunteers.view'], 'intern has volunteers.view').toBe(true);
    try {
      await login(page, user);
      await page.goto('/members');
      await expect(page).toHaveURL(`${BASE_URL}/members`);
      const volunteersEntry = navbar(page).getByRole('button', { name: 'Volunteers', exact: true });
      await expect(volunteersEntry).toBeVisible();

      await api.saveRolePolicy('intern', {
        active: original.active,
        permissions: {
          ...original.permissions,
          'volunteers.view': false,
          'volunteers.certificate': false,
        },
      });
      await volunteersEntry.click();

      await expect(page).toHaveURL(HOME_URL);
      await expect(page.getByRole('searchbox', { name: 'Search for volunteer' })).toHaveCount(0);
    } finally {
      await api.saveRolePolicy('intern', {
        active: original.active,
        permissions: original.permissions,
      });
      await api.updateUser(user.id, { role: user.role, active: false });
    }
  });

  test('F12.8 an intern cannot open the audit log: no Settings page and 403 from GET /api/settings/logs', async ({
    page,
  }) => {
    const intern = readAccounts().intern;
    await login(page, intern);

    await page.goto('/setting');
    await expect(page).toHaveURL(HOME_URL);
    await expect(page.getByRole('button', { name: 'Audit log' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Audit log' })).toHaveCount(0);

    const { status, token } = await apiLogin(intern.username, intern.password);
    expect(status).toBe(200);
    const asIntern = await ApiHelper.create(token as string);
    try {
      expect(await asIntern.status('settings/logs')).toBe(403);
    } finally {
      await asIntern.dispose();
    }
  });
});
