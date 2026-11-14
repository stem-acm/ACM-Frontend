import { Page } from '@playwright/test';
import { Member, uniqueSuffix } from './fixtures/api';
import { expect, test } from './fixtures/test';

const views = [
  {
    name: 'members',
    url: '/members',
    endpoint: '/api/members',
    columns: 6,
    empty: 'No members yet.',
  },
  {
    name: 'activities',
    url: '/activity',
    endpoint: '/api/activities',
    columns: 9,
    empty: 'No activities yet.',
  },
  {
    name: 'volunteers',
    url: '/volunteer',
    endpoint: '/api/volunteers',
    columns: 5,
    empty: 'No volunteers yet.',
  },
  {
    name: 'history',
    url: '/checkin-history',
    endpoint: '/api/checkins',
    columns: 6,
    empty: 'No check-ins yet.',
  },
  {
    name: 'dashboard check-ins',
    url: '/',
    endpoint: '/api/dashboard',
    columns: 5,
    empty: 'No check-ins yet.',
  },
  {
    name: 'book loans',
    url: '/book',
    endpoint: '/api/book-loans',
    columns: 7,
    empty: 'No book loans yet.',
  },
  {
    name: 'accounts',
    url: '/setting',
    endpoint: '/api/settings/users',
    columns: 5,
    empty: 'No accounts yet.',
  },
  {
    name: 'audit logs',
    url: '/setting',
    endpoint: '/api/settings/logs',
    columns: 6,
    empty: 'No audit logs yet.',
    logs: true,
  },
];

async function openLogs(page: Page) {
  await page.getByRole('tablist').getByRole('button', { name: 'Audit log', exact: true }).click();
}

function rows(page: Page) {
  return page.getByRole('table').filter({ visible: true }).locator('tbody > tr');
}

function nameHeader(page: Page, label: string) {
  return page
    .getByRole('columnheader')
    .filter({ has: page.getByRole('button', { name: label, exact: true }) });
}

test.describe('Uniform data tables', () => {
  for (const view of views) {
    test(`${view.name}: skeleton matches columns and resolves to the shared empty state`, async ({
      page,
    }) => {
      let release!: () => void;
      const ready = new Promise<void>(resolve => {
        release = resolve;
      });
      await page.route(
        url => url.pathname === view.endpoint,
        async route => {
          await ready;
          await route.fulfill({
            json: {
              success: true,
              message: 'Test empty state',
              data:
                view.endpoint === '/api/dashboard'
                  ? { members: 0, activities: 0, checkins: [] }
                  : [],
              pagination: { offset: 0, limit: 100, total: 0, hasMore: false },
            },
          });
        },
      );
      try {
        await page.goto(view.url);
        if ('logs' in view) await openLogs(page);
        const loading = page.locator('app-table-loading table');
        await expect(loading).toBeVisible();
        await expect(loading).toHaveAttribute('aria-busy', 'true');
        await expect(loading.locator('thead th')).toHaveCount(view.columns);
        await expect(loading.locator('tbody tr')).toHaveCount(5);
        await expect(loading.locator('tbody td')).toHaveCount(view.columns * 5);
        release();
        const empty = page.locator('app-table-empty');
        await expect(empty).toBeVisible();
        await expect(empty).toContainText(view.empty);
        await expect(empty.locator('svg')).toHaveCount(1);
        await expect(loading).toHaveCount(0);
      } finally {
        release();
      }
    });
  }

  for (const kind of [
    'members',
    'activities',
    'volunteers',
    'checkins',
    'books',
    'accounts',
    'audit',
  ] as const) {
    test(`${kind}: newest first, then name ascending and descending with accessible arrows`, async ({
      page,
      api,
    }) => {
      test.setTimeout(60_000);
      const prefix = `Sort${uniqueSuffix()}`;
      const labels = ['Zeta', 'Alpha', 'Middle'].map(value => prefix + value);
      const members: Member[] = [];
      const activities: number[] = [];
      let url = '';
      let header = 'Name';
      try {
        if (kind === 'activities') {
          for (const name of labels) activities.push((await api.createActivity({ name })).id);
          url = '/activity';
        } else if (kind === 'accounts') {
          for (let i = 0; i < labels.length; i++) {
            const user = await api.createUser('intern', labels[i]);
            labels[i] = user.username;
          }
          url = '/setting';
          header = 'Username';
        } else if (kind === 'books') {
          const member = await api.createMember();
          members.push(member);
          for (const bookTitle of labels)
            await api.post('book-loans', {
              registrationNumber: member.registrationNumber,
              bookTitle,
              borrowingDate: '2020-03-03',
              expectedReturnDate: '2020-03-10',
              effectiveReturnDate: null,
            });
          url = '/book';
          header = 'Book title';
        } else {
          for (const lastName of labels)
            members.push(await api.createMember({ firstName: 'Sorttest', lastName }));
          if (kind === 'volunteers') {
            for (const member of members)
              await api.post('volunteers', [
                {
                  registrationNumber: member.registrationNumber,
                  role: 'Volunteer',
                  joinDate: '2025-01-07',
                  expirationDate: '2026-01-07',
                },
              ]);
            url = '/volunteer';
          } else if (kind === 'checkins') {
            const activity = await api.createActivity();
            activities.push(activity.id);
            for (let i = 0; i < members.length; i++)
              await api.createCheckin(
                members[i].registrationNumber,
                activity.id,
                new Date(`2020-03-0${5 - i}T09:00:00+03:00`),
              );
            url = '/checkin-history';
          } else if (kind === 'audit') {
            url = '/setting';
            header = 'Record';
          } else url = '/members';
        }
        await page.goto(url);
        if (kind === 'audit') {
          await openLogs(page);
          await page.getByRole('searchbox', { name: 'Search', exact: true }).fill(prefix);
          await expect(page.locator('.audit-summary-bar')).toContainText('3 results');
        }
        if (kind === 'books') {
          await page
            .getByRole('searchbox', { name: 'Search book loans', exact: true })
            .fill(prefix);
          await expect(page.locator('.acm-filter-summary')).toContainText('3 loan(s)');
        }
        const matching = rows(page).filter({ hasText: new RegExp(prefix, 'i') });
        await expect(matching).toHaveCount(3);
        for (const [index, label] of [labels[2], labels[1], labels[0]].entries()) {
          await expect(matching.nth(index)).toContainText(new RegExp(label, 'i'));
        }
        const th = nameHeader(page, header);
        await expect(th).toHaveAttribute('aria-sort', 'none');
        await th.getByRole('button').click();
        await expect(th).toHaveAttribute('aria-sort', 'ascending');
        await expect(th).toContainText('↑');
        for (const [index, label] of [labels[1], labels[2], labels[0]].entries()) {
          await expect(matching.nth(index)).toContainText(new RegExp(label, 'i'));
        }
        await th.getByRole('button').click();
        await expect(th).toHaveAttribute('aria-sort', 'descending');
        await expect(th).toContainText('↓');
        for (const [index, label] of [labels[0], labels[2], labels[1]].entries()) {
          await expect(matching.nth(index)).toContainText(new RegExp(label, 'i'));
        }
      } finally {
        // Loans have no delete endpoint and prevent member deletion. Both live only
        // in this disposable test database, removed by the global teardown.
        if (kind !== 'books') {
          for (const member of members) await api.deleteMemberIfExists(member.registrationNumber);
        }
        for (const id of activities) await api.deleteActivityIfExists(id);
      }
    });
  }

  test('member sorting covers all API pages and resets the displayed page', async ({ page }) => {
    const members = Array.from({ length: 101 }, (_, index) => ({
      registrationNumber: index + 1,
      firstName: 'Sorttest',
      lastName: index === 100 ? 'Aardvark' : `Zed${String(index).padStart(3, '0')}`,
      createdAt: new Date(Date.UTC(2026, 0, 1) - index * 1000).toISOString(),
      occupation: 'student',
      joinDate: '2024-01-01',
      studyOrWorkPlace: 'School',
    }));
    await page.route(
      url => url.pathname === '/api/members',
      async route => {
        const offset = Number(new URL(route.request().url()).searchParams.get('offset'));
        await route.fulfill({
          json: {
            success: true,
            data: members.slice(offset, offset + 100),
            pagination: { offset, limit: 100, total: 101, hasMore: offset === 0 },
          },
        });
      },
    );
    await page.goto('/members');
    await expect(rows(page)).toHaveCount(100);
    await expect(rows(page).first()).toContainText('ZED000');
    await page.getByRole('button', { name: 'Next', exact: true }).filter({ visible: true }).click();
    await expect(rows(page)).toHaveCount(1);
    await nameHeader(page, 'Name').getByRole('button').click();
    await expect(rows(page)).toHaveCount(100);
    await expect(rows(page).first()).toContainText('AARDVARK');
    await expect(
      page.getByText('Page 1 of 2', { exact: true }).filter({ visible: true }),
    ).toBeVisible();
  });
});
