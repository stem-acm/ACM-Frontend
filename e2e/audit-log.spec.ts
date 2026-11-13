import { Locator, Page } from '@playwright/test';
import { ApiHelper, Member, apiLogin, generatePassword, uniqueSuffix } from './fixtures/api';
import { expect, test } from './fixtures/test';

/** Rows per page of the audit log (AuditLogComponent.pageSize). */
const PAGE_SIZE = 25;

interface AuditLogRow {
  id: number;
  type: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  actorUsername: string;
  changes: Record<string, unknown>;
}

/** A wall-clock time in EAT, e.g. eat('2020-03-03', '09:00'). */
function eat(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+03:00`);
}

/** "LASTNAME Firstname", as the audit log writes a member. */
function memberLabel(member: Member): string {
  return `${(member.lastName ?? '').toUpperCase()} ${member.firstName}`;
}

/** Log rows of the API for a search text, newest first. */
async function apiLogs(api: ApiHelper, query: string): Promise<AuditLogRow[]> {
  return (await api.getPage<AuditLogRow>(`settings/logs?limit=100&${query}`)).data;
}

async function openAuditLog(page: Page) {
  await page.goto('/setting');
  // The tabs carry role="tab", but the z-button directive turns them into "button".
  await page.getByRole('tablist').getByRole('button', { name: 'Audit log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit log', level: 2 })).toBeVisible();
}

async function searchFor(page: Page, text: string) {
  await page.getByRole('searchbox', { name: 'Search' }).fill(text);
}

/** Rows of the desktop table (the phone cards repeat the same texts). */
function rows(page: Page): Locator {
  return page.locator('tr.audit-row');
}

/** Rows of one action family: create, update, delete or cascade. */
function rowsOf(page: Page, family: 'create' | 'update' | 'delete' | 'cascade'): Locator {
  return rows(page).filter({ has: page.locator(`.audit-badge--${family}`) });
}

/** Opens the detail of a row and returns the panel below it. */
async function openDetail(row: Locator): Promise<Locator> {
  await row.getByRole('button', { name: 'Details' }).click();
  await expect(row.getByRole('button', { name: 'Details' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  return row.locator('xpath=following-sibling::tr[1]').locator('.audit-detail');
}

function resultCount(page: Page, text: string) {
  return page.locator('.audit-summary-bar').getByText(text, { exact: true });
}

test.describe('F15 Audit log', () => {
  test('F15.1 a new member has a "Created" row with its values, done by the admin', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Logged' });
    try {
      await openAuditLog(page);
      await searchFor(page, member.lastName ?? '');

      await expect(rows(page)).toHaveCount(1);
      const row = rowsOf(page, 'create');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(memberLabel(member));
      await expect(row).toContainText(`Member #${member.registrationNumber}`);
      await expect(row).toContainText('New member');
      await expect(row).toContainText('admin');
      await expect(row).toContainText('Admin');

      const detail = await openDetail(row);
      await expect(detail).toContainText('member.created');
      await expect(detail).toContainText('Value at creation');
      await expect(detail.getByRole('row').filter({ hasText: 'First Name' })).toContainText(
        'Logged',
      );
      await expect(detail.getByRole('row').filter({ hasText: 'Phone Number' })).toContainText(
        member.phoneNumber ?? '',
      );
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
    }
  });

  test('F15.2 a deleted member shows "Deleted", and its check-in and volunteer record show "Deleted with parent"', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Cascade' });
    const activity = await api.createActivity();
    const label = memberLabel(member);
    try {
      const checkin = await api.createCheckin(
        member.registrationNumber,
        activity.id,
        eat('2020-03-03', '09:00'),
      );
      const volunteer = await api.post<{ id: number }>('volunteers', {
        registrationNumber: member.registrationNumber,
        role: 'Volunteer',
        joinDate: '2025-01-07',
        expirationDate: '2026-01-07',
      });

      // A new check-in writes no log.
      const search = `search=${encodeURIComponent(member.lastName ?? '')}`;
      expect(await apiLogs(api, `entity=checkins&${search}`)).toEqual([]);

      await api.deleteMember(member.registrationNumber);

      await openAuditLog(page);
      await searchFor(page, member.lastName ?? '');

      // member.created, volunteer.created, the two cascade rows and member.deleted.
      await expect(rows(page)).toHaveCount(5);

      const deleted = rowsOf(page, 'delete');
      await expect(deleted).toHaveCount(1);
      await expect(deleted).toContainText(label);
      await expect(deleted).toContainText(`Member #${member.registrationNumber}`);
      await expect(deleted).toContainText('Member removed');

      const cascade = rowsOf(page, 'cascade');
      await expect(cascade).toHaveCount(2);
      const checkinRow = cascade.filter({ hasText: `Check-in #${checkin.id}` });
      await expect(checkinRow).toContainText(`${label}, ${activity.name}`);
      await expect(checkinRow).toContainText(
        `Check-in of 03 / 03 / 2020, 09:00 removed with member ${label}`,
      );
      const volunteerRow = cascade.filter({ hasText: `Volunteer #${volunteer.id}` });
      await expect(volunteerRow).toContainText(`Volunteer removed with member ${label}`);

      // Newest first, the member comes before the rows deleted with it.
      const texts = await rows(page).allTextContents();
      const memberIndex = texts.findIndex(text => text.includes('Member removed'));
      const cascadeIndexes = texts
        .map((text, index) => (text.includes('removed with member') ? index : -1))
        .filter(index => index >= 0);
      expect(memberIndex).toBe(0);
      expect(cascadeIndexes).toEqual([1, 2]);

      const detail = await openDetail(checkinRow);
      await expect(detail).toContainText('checkin.cascade_deleted');
      await expect(detail).toContainText(
        `Deleted with member ${label} (#${member.registrationNumber})`,
      );
      await expect(detail).toContainText('Value before deletion');
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F15.3 a check-in deleted on its own has a "Deleted" row with the member and the activity', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Checked' });
    const activity = await api.createActivity();
    try {
      const checkin = await api.createCheckin(
        member.registrationNumber,
        activity.id,
        eat('2020-03-04', '15:30'),
      );
      await api.deleteCheckin(checkin.id);

      await openAuditLog(page);
      await searchFor(page, member.lastName ?? '');
      await page.getByLabel('Record type').selectOption({ label: 'Check-ins' });

      await expect(rows(page)).toHaveCount(1);
      const row = rowsOf(page, 'delete');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(`${memberLabel(member)}, ${activity.name}`);
      await expect(row).toContainText(`Check-in #${checkin.id}`);
      await expect(row).toContainText('Check-in of 04 / 03 / 2020, 15:30 removed');
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F15.4 a loan has one row when it is lent and exactly one row when it is returned', async ({
    page,
    api,
  }) => {
    // Loans cannot be deleted, so their member stays: one keeper for every run.
    const { data } = await api.getPage<Member>('members?limit=100&search=Auditkeeper');
    const keeper =
      data.find(m => m.lastName === 'Auditkeeper') ??
      (await api.createMember({ firstName: 'E2e', lastName: 'Auditkeeper' }));
    const title = `Audit book ${uniqueSuffix()}`;
    const loan = await api.post<{ id: number }>('book-loans', {
      registrationNumber: keeper.registrationNumber,
      bookTitle: title,
      borrowingDate: '2026-01-05',
      expectedReturnDate: '2026-01-19',
      effectiveReturnDate: null,
    });
    await api.patch(`book-loans/${loan.id}/return`, { effectiveReturnDate: '2026-01-10' });

    await openAuditLog(page);
    await searchFor(page, title);

    await expect(rows(page)).toHaveCount(2);
    const lent = rowsOf(page, 'create');
    await expect(lent).toHaveCount(1);
    await expect(lent).toContainText(`${title}, ${memberLabel(keeper)}`);
    await expect(lent).toContainText(`Book loan #${loan.id}`);
    await expect(lent).toContainText('Lent on 05 / 01 / 2026, due 19 / 01 / 2026');

    const returned = rowsOf(page, 'update');
    await expect(returned).toHaveCount(1);
    await expect(returned).toContainText('Returned on 10 / 01 / 2026');
    await expect(rows(page).filter({ hasText: 'changed' })).toHaveCount(0);

    const detail = await openDetail(returned);
    await expect(detail).toContainText('book_loan.returned');
    await expect(detail.locator('.audit-after')).toHaveText('10 / 01 / 2026');
    await expect(detail.locator('.audit-none')).toHaveText('Empty');
  });

  test('F15.5 an account has rows for its creation, password, role and status, and no row shows a password', async ({
    page,
    api,
  }) => {
    const user = await api.createUser('intern', 'audit');
    const newPassword = generatePassword();
    try {
      // The user changes their own password: the row is done by them, not by the admin.
      const { status, token } = await apiLogin(user.username, user.password);
      expect(status).toBe(200);
      const asUser = await ApiHelper.create(token as string);
      try {
        await asUser.put('auth/profile', { currentPassword: user.password, newPassword });
      } finally {
        await asUser.dispose();
      }
      await api.updateUser(user.id, { role: 'volunteer', active: true });
      await api.updateUser(user.id, { role: 'volunteer', active: false });

      // No stored row contains a password or a hash.
      const stored = JSON.stringify(
        await apiLogs(api, `search=${encodeURIComponent(user.username)}`),
      );
      expect(stored).not.toContain(user.password);
      expect(stored).not.toContain(newPassword);
      expect(stored).not.toMatch(/"password"|\$2[aby]\$/);

      await openAuditLog(page);
      await searchFor(page, user.username);

      await expect(rows(page)).toHaveCount(4);
      const created = rowsOf(page, 'create');
      await expect(created).toHaveCount(1);
      await expect(created).toContainText(`Account #${user.id}`);
      await expect(created).toContainText('Account created with role Intern');

      const updated = rowsOf(page, 'update');
      await expect(updated).toHaveCount(3);
      await expect(updated.filter({ hasText: 'Role: Intern to Volunteer' })).toHaveCount(1);
      await expect(updated.filter({ hasText: 'Status: Active to Inactive' })).toHaveCount(1);
      const password = updated.filter({ hasText: 'Password changed' });
      await expect(password).toHaveCount(1);
      // Done by the user, with the role they had at that time.
      await expect(password.locator('td').nth(1)).toHaveText(
        new RegExp(`${user.username}\\s*Intern`),
      );

      const createdDetail = await openDetail(created);
      await expect(createdDetail.getByRole('row').filter({ hasText: 'Username' })).toContainText(
        user.username,
      );
      await expect(createdDetail.getByRole('row').filter({ hasText: /^Password/ })).toHaveCount(0);

      const passwordDetail = await openDetail(password);
      await expect(passwordDetail).toContainText(
        'The password was changed. Its value is never recorded.',
      );
      await expect(passwordDetail.getByRole('table')).toHaveCount(0);
    } finally {
      await api.updateUser(user.id, { role: 'volunteer', active: false });
    }
  });

  test('F15.6 a permission removed from a role has a "Permissions changed" row with its before and after', async ({
    page,
    api,
    policies,
  }) => {
    const original = await policies.remember('volunteer');
    // A first save with no change makes sure the policy row exists: the next save is a change.
    await api.saveRolePolicy('volunteer', {
      active: original.active,
      permissions: original.permissions,
    });
    const feature = 'books.view';
    const before = original.permissions[feature];
    await api.saveRolePolicy('volunteer', {
      active: original.active,
      permissions: {
        ...original.permissions,
        // books.create and books.update would turn books.view back on.
        'books.create': false,
        'books.update': false,
        [feature]: !before,
      },
    });
    const [newest] = await apiLogs(api, 'type=role_policy.permissions_changed');
    expect(newest.entityId).toBe('volunteer');
    const changed = Object.keys(newest.changes).length;
    expect(newest.changes[feature]).toEqual({ before, after: !before });

    await openAuditLog(page);
    await page.getByLabel('Type of change').selectOption({ label: 'Permissions changed' });

    const row = rows(page).first();
    await expect(row).toContainText('Volunteer');
    await expect(row).toContainText('Role permissions #volunteer');
    await expect(row).toContainText(
      new RegExp(`^.*${changed} permissions? changed: \\d+ granted, \\d+ removed`),
    );

    const detail = await openDetail(row);
    await expect(detail).toContainText('role_policy.permissions_changed');
    const line = detail.getByRole('row').filter({ hasText: 'Books' }).filter({ hasText: 'View' });
    await expect(line.locator('.audit-before')).toHaveText(before ? 'Allowed' : 'Not allowed');
    await expect(line.locator('.audit-after')).toHaveText(before ? 'Not allowed' : 'Allowed');
  });

  test('F15.7 the filters narrow the list, show their chips, and "Clear filters" restores it', async ({
    page,
    api,
  }) => {
    const activity = await api.createActivity();
    const member = await api.createMember({ firstName: 'Filtered' });
    const actor = await api.createUser('intern', 'auditfilter');
    try {
      await api.put(`activities/${activity.id}`, { name: `${activity.name} renamed` });

      await openAuditLog(page);
      await expect(rows(page).first()).toBeVisible();
      const summary = page.locator('.audit-summary-bar');
      const allResults = await summary.locator('span').first().innerText();

      // Record type.
      await page.getByLabel('Record type').selectOption({ label: 'Activities' });
      await expect(
        summary.getByRole('button', { name: 'Remove filter: Activities' }),
      ).toBeVisible();
      await expect(rows(page).first()).toContainText(/Activity #\d+/);
      for (const text of await rows(page).allTextContents()) {
        expect(text).toMatch(/Activity #\d+/);
      }

      // Record type and search.
      await searchFor(page, activity.name);
      await expect(rows(page)).toHaveCount(2);
      await expect(rowsOf(page, 'create')).toContainText('New activity, 08:00 to 18:00');
      await expect(rowsOf(page, 'update')).toContainText('1 field changed: Activity name');

      // The type list holds only the types of the selected record type.
      const typeFilter = page.getByLabel('Type of change');
      await expect(typeFilter.locator('option')).toHaveText([
        'All',
        'Activity created',
        'Activity updated',
        'Activity deleted',
      ]);
      await typeFilter.selectOption({ label: 'Activity updated' });
      await expect(rows(page)).toHaveCount(1);
      await expect(rowsOf(page, 'update')).toHaveCount(1);

      // "Clear filters" brings back the full list.
      await summary.getByRole('button', { name: 'Clear filters' }).click();
      await expect(page.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
      await expect(page.getByLabel('Record type')).toHaveValue('');
      await expect(summary.getByRole('button', { name: /^Remove filter/ })).toHaveCount(0);
      await expect(summary.locator('span').first()).toHaveText(allResults);

      // Done by: an account that made no change has no row.
      const doneBy = page.getByLabel('Done by');
      const option = await doneBy.locator('option', { hasText: actor.username }).innerText();
      await doneBy.selectOption({ label: option.trim() });
      await expect(page.getByText('No results match your search or filters.')).toBeVisible();
      await expect(rows(page)).toHaveCount(0);
      await summary.getByRole('button', { name: `Remove filter: ${actor.username}` }).click();
      await expect(rows(page).first()).toBeVisible();

      // Period: a start date after today has no row.
      await page.getByLabel('Start date').fill('2099-01-01');
      await expect(rows(page)).toHaveCount(0);
      await page.getByRole('button', { name: 'Clear filters' }).first().click();
      await expect(rows(page).first()).toBeVisible();

      // Period: today contains the rows of this test.
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
      await page.getByLabel('Start date').fill(today);
      await page.getByLabel('End date').fill(today);
      await searchFor(page, member.lastName ?? '');
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page)).toContainText('New member');
    } finally {
      await api.deleteActivityIfExists(activity.id);
      await api.deleteMemberIfExists(member.registrationNumber);
      await api.updateUser(actor.id, { role: 'intern', active: false });
    }
  });

  test('F15.8 the list shows 25 rows per page, newest first, with Previous and Next', async ({
    page,
    api,
  }) => {
    const prefix = `Paged${uniqueSuffix()}`;
    const total = PAGE_SIZE + 1;
    const members: Member[] = [];
    try {
      for (let index = 1; index <= total; index++) {
        members.push(
          await api.createMember({
            firstName: 'Paged',
            lastName: `${prefix}n${String(index).padStart(2, '0')}`,
          }),
        );
      }

      await openAuditLog(page);
      await searchFor(page, prefix);

      await expect(resultCount(page, `${total} results`)).toBeVisible();
      await expect(rows(page)).toHaveCount(PAGE_SIZE);
      await expect(
        page.getByText(`Showing 1 to ${PAGE_SIZE} of ${total} results`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible();
      const previous = page.getByRole('button', { name: 'Previous', exact: true });
      const next = page.getByRole('button', { name: 'Next', exact: true });
      await expect(previous).toBeDisabled();
      // Newest first: the last member created is the first row.
      await expect(rows(page).first()).toContainText(memberLabel(members[total - 1]));

      await next.click();
      await expect(
        page.getByText(`Showing ${total} to ${total} of ${total} results`, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible();
      await expect(rows(page)).toHaveCount(1);
      await expect(rows(page).first()).toContainText(memberLabel(members[0]));
      await expect(next).toBeDisabled();

      await previous.click();
      await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible();
      await expect(rows(page)).toHaveCount(PAGE_SIZE);
    } finally {
      for (const member of members) {
        await api.deleteMemberIfExists(member.registrationNumber);
      }
    }
  });

  test('F15.9 at phone width the rows are cards, and "Details" opens the same panel', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Phone' });
    try {
      await api.put(`members/${member.registrationNumber}`, { address: 'New phone address' });
      await page.setViewportSize({ width: 375, height: 812 });
      await openAuditLog(page);
      await searchFor(page, member.lastName ?? '');

      await expect(page.locator('.audit-table-desktop')).toBeHidden();
      const cards = page.locator('article.acm-mobile-record');
      await expect(cards).toHaveCount(2);
      const card = cards.filter({ has: page.locator('.audit-badge--update') });
      await expect(card).toBeVisible();
      await expect(card).toContainText(memberLabel(member));
      await expect(card).toContainText('1 field changed: Address');

      await card.getByRole('button', { name: 'Details' }).click();
      const detail = card.locator('.audit-detail');
      await expect(detail).toBeVisible();
      await expect(detail.locator('.audit-after')).toHaveText('New phone address');

      // The page does not scroll sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
    }
  });
});
