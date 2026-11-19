import { Page } from '@playwright/test';
import { Activity, ApiHelper, Checkin, Member } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { expect, test } from './fixtures/test';

/** Rows per page of the history list (CheckinHistoryComponent.pageSize). */
const PAGE_SIZE = 10;

/** A wall-clock time in EAT, e.g. eat('2020-03-03', '09:00'). */
function eat(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+03:00`);
}

/**
 * `count` distinct days at 09:00 EAT, Tuesday to Friday only (an allowed
 * check-in window), from `firstDay` on.
 */
function allowedMornings(firstDay: string, count: number): Date[] {
  const result: Date[] = [];
  const day = new Date(`${firstDay}T00:00:00Z`);
  while (result.length < count) {
    const weekday = day.getUTCDay();
    if (weekday >= 2 && weekday <= 5) {
      result.push(eat(day.toISOString().slice(0, 10), '09:00'));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

/** "Mar 3, 2020", as the table writes the check-in date (browser in EAT). */
function tableDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  });
}

/** "9:00 AM", as the table writes a time (browser in EAT). */
function tableTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  });
}

/** "LASTNAME Firstname", as the table writes the member. */
function tableName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${(member.lastName ?? '').toUpperCase()} ${member.firstName}`;
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

function memberRows(page: Page, member: Member) {
  return bodyRows(page).filter({
    has: page.getByRole('rowheader').filter({ hasText: tableName(member) }),
  });
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search check-in history' });
}

function showing(page: Page, from: number, to: number, total: number) {
  return page.getByText(`Showing ${from} to ${to} of ${total} results`, { exact: true });
}

/** "Page X of Y" of the desktop pagination bar (the mobile one is hidden). */
function pageIndicator(page: Page, current: number, total: number) {
  return page.getByText(`Page ${current} of ${total}`, { exact: true }).filter({ visible: true });
}

/** All check-ins, including records beyond the API's first page. */
async function loadedCheckins(api: ApiHelper): Promise<Checkin[]> {
  const all: Checkin[] = [];
  let offset = 0;
  while (true) {
    const page = await api.getPage<Checkin>(`checkins?offset=${offset}&limit=100`);
    all.push(...page.data);
    if (!page.pagination.hasMore) return all;
    offset += 100;
  }
}

function resultCount(page: Page, count: number) {
  return page.getByRole('status').filter({ hasText: new RegExp(`^\\s*${count} results?\\s*$`) });
}

interface Scene {
  member: Member;
  activity: Activity;
}

async function createScene(api: ApiHelper, firstName: string): Promise<Scene> {
  const member = await api.createMember({ firstName });
  const activity = await api.createActivity();
  return { member, activity };
}

/** Deleting the member and the activity also deletes their check-ins. */
async function cleanup(api: ApiHelper, ...scenes: Scene[]): Promise<void> {
  for (const { member, activity } of scenes) {
    await api.deleteMemberIfExists(member.registrationNumber);
    await api.deleteActivityIfExists(activity.id);
  }
}

test.describe('F8 Check-in history', () => {
  test('F8.1 a check-in created for the test is listed with member, activity and time', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Historyone');
    try {
      const checkin = await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2020-03-03', '09:15'),
        eat('2020-03-03', '11:40'),
      );

      await page.goto('/checkin-history');

      const row = memberRows(page, scene.member);
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('rowheader')).toContainText(tableName(scene.member));
      await expect(row.getByRole('rowheader')).toContainText(
        String(scene.member.registrationNumber),
      );
      await expect(row.getByRole('cell')).toHaveText([
        tableDate(checkin.checkInTime),
        tableTime(checkin.checkInTime),
        scene.activity.name,
        tableTime(checkin.checkOutTime as string),
        'View profil',
      ]);
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F8.2 searching by member name lists only that member’s rows', async ({ page, api }) => {
    const target = await createScene(api, 'Historysearch');
    const other = await createScene(api, 'Historyother');
    try {
      await api.seedCheckin(
        target.member.registrationNumber,
        target.activity.id,
        eat('2020-03-04', '09:00'),
      );
      await api.seedCheckin(
        target.member.registrationNumber,
        target.activity.id,
        eat('2020-03-04', '15:30'),
      );
      await api.seedCheckin(
        other.member.registrationNumber,
        other.activity.id,
        eat('2020-03-04', '10:00'),
      );

      await page.goto('/checkin-history');
      await expect(memberRows(page, other.member)).toHaveCount(1);

      await searchBox(page).fill(target.member.lastName ?? '');

      await expect(bodyRows(page)).toHaveCount(2);
      await expect(memberRows(page, target.member)).toHaveCount(2);
      await expect(memberRows(page, other.member)).toHaveCount(0);
      await expect(showing(page, 1, 2, 2)).toBeVisible();
    } finally {
      await cleanup(api, target, other);
    }
  });

  test('F8.3 the date range keeps only rows inside it, a range with no check-in shows the empty state', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Historyrange');
    const rangeStart = '2019-06-12';
    const rangeEnd = '2019-06-13';
    try {
      const before = await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2019-06-11', '09:00'),
      );
      const insideFirst = await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2019-06-12', '09:00'),
      );
      const insideLast = await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2019-06-13', '17:00'),
      );
      const after = await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2019-06-14', '09:00'),
      );

      await page.goto('/checkin-history');
      await expect(memberRows(page, scene.member)).toHaveCount(4);

      await page.getByLabel('Start date').fill(rangeStart);
      await page.getByLabel('End date').fill(rangeEnd);

      const rows = memberRows(page, scene.member);
      await expect(rows).toHaveCount(2);
      await expect(rows.filter({ hasText: tableDate(insideFirst.checkInTime) })).toHaveCount(1);
      await expect(rows.filter({ hasText: tableDate(insideLast.checkInTime) })).toHaveCount(1);
      await expect(rows.filter({ hasText: tableDate(before.checkInTime) })).toHaveCount(0);
      await expect(rows.filter({ hasText: tableDate(after.checkInTime) })).toHaveCount(0);
      const allowed = [tableDate(insideFirst.checkInTime), tableDate(insideLast.checkInTime)];
      for (const row of await bodyRows(page).all()) {
        const shown = ((await row.getByRole('cell').first().textContent()) ?? '').trim();
        expect(allowed, `row date ${shown} is inside the range`).toContain(shown);
      }

      await page.getByLabel('Start date').fill('1999-01-05');
      await page.getByLabel('End date').fill('1999-01-06');

      await expect(bodyRows(page)).toHaveCount(0);
      await expect(
        page.getByRole('status').getByText('No results match your search or filters.'),
      ).toBeVisible();
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F8.4 clearing the filters shows the full list again, pagination moves to the next page and back', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Historypager');
    try {
      const existing = (await api.getPage<Checkin>('checkins?limit=1')).pagination.total;
      const toCreate = Math.max(1, PAGE_SIZE + 1 - existing);
      for (const at of allowedMornings('2018-01-02', toCreate)) {
        await api.seedCheckin(scene.member.registrationNumber, scene.activity.id, at);
      }
      const loaded = await loadedCheckins(api);
      const total = loaded.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      expect(total, 'more check-ins than one page').toBeGreaterThan(PAGE_SIZE);

      await page.goto('/checkin-history');
      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).filter({ visible: true }).click();
      await expect(pageIndicator(page, 2, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(Math.min(PAGE_SIZE, total - PAGE_SIZE));
      await expect(
        showing(page, PAGE_SIZE + 1, Math.min(2 * PAGE_SIZE, total), total),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Previous' }).filter({ visible: true }).click();
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();

      await searchBox(page).fill(`nomatch${scene.member.lastName}`);
      await page.getByLabel('Start date').fill('1999-01-05');
      await page.getByLabel('End date').fill('1999-01-06');
      await expect(page.getByText('No results match your search or filters.')).toBeVisible();

      await page.getByRole('button', { name: 'Clear filters' }).click();

      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(searchBox(page)).toHaveValue('');
      await expect(page.getByLabel('Start date')).toHaveValue('');
      await expect(page.getByLabel('End date')).toHaveValue('');
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F8.5 clicking the member in a row opens that member’s profile', async ({ page, api }) => {
    const scene = await createScene(api, 'Historyprofile');
    try {
      await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2020-03-05', '09:00'),
      );

      await page.goto('/checkin-history');
      await memberRows(page, scene.member).getByRole('link', { name: 'View profil' }).click();

      await expect(page).toHaveURL(`${BASE_URL}/profil/${scene.member.registrationNumber}`);
      const lastName = scene.member.lastName ?? '';
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `${lastName.charAt(0).toUpperCase()}${lastName.slice(1)} ${scene.member.firstName}`,
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await cleanup(api, scene);
    }
  });

  test('F8.6 activity, search and date filters combine, reset pagination and show the matching total including zero', async ({
    page,
    api,
  }) => {
    test.setTimeout(60_000);
    const target = await createScene(api, 'Activityfilter');
    const other = await createScene(api, 'Otheractivity');
    const days = allowedMornings('2017-01-03', 11);
    try {
      for (const at of days) {
        await api.seedCheckin(target.member.registrationNumber, target.activity.id, at);
      }
      await api.seedCheckin(other.member.registrationNumber, other.activity.id, days[0]);
      const total = (await api.getPage<Checkin>('checkins?limit=1')).pagination.total;
      await page.goto('/checkin-history');
      await expect(resultCount(page, total)).toBeVisible();
      await page
        .getByRole('button', { name: 'Next', exact: true })
        .filter({ visible: true })
        .click();
      await page.getByLabel('Filter by activity').selectOption({ label: target.activity.name });
      await expect(resultCount(page, 11)).toBeVisible();
      await expect(pageIndicator(page, 1, 2)).toBeVisible();
      await expect(memberRows(page, target.member)).toHaveCount(10);
      await expect(memberRows(page, other.member)).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Next', exact: true })
        .filter({ visible: true })
        .click();
      await expect(memberRows(page, target.member)).toHaveCount(1);
      await expect(resultCount(page, 11)).toBeVisible();

      const day = days[0].toISOString().slice(0, 10);
      await page.getByLabel('Start date').fill(day);
      await page.getByLabel('End date').fill(day);
      await searchBox(page).fill(target.member.lastName as string);
      await expect(resultCount(page, 1)).toBeVisible();
      await expect(pageIndicator(page, 1, 1)).toBeVisible();
      await expect(memberRows(page, target.member)).toHaveCount(1);
      await searchBox(page).fill(other.member.lastName as string);
      await expect(resultCount(page, 0)).toBeVisible();
      await expect(
        page.getByText('No results match your search or filters.', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await expect(page.getByLabel('Filter by activity').locator('option:checked')).toHaveText(
        'All activities',
      );
      await expect(searchBox(page)).toHaveValue('');
      await expect(page.getByLabel('Start date')).toHaveValue('');
      await expect(page.getByLabel('End date')).toHaveValue('');
      await expect(resultCount(page, total)).toBeVisible();
    } finally {
      await cleanup(api, target, other);
    }
  });

  test('F8.7 the total and activity options include history beyond the first 100 API records', async ({
    page,
    api,
  }) => {
    test.setTimeout(90_000);
    const oldest = await createScene(api, 'Beyondlimit');
    const recent = await createScene(api, 'Recenthistory');
    try {
      await api.seedCheckin(
        oldest.member.registrationNumber,
        oldest.activity.id,
        eat('2016-01-05', '09:00'),
      );
      for (const at of allowedMornings('2016-02-02', 100)) {
        await api.seedCheckin(recent.member.registrationNumber, recent.activity.id, at);
      }
      const firstPage = await api.getPage<Checkin>('checkins?limit=100');
      expect(
        firstPage.data.some(row => row.registrationNumber === oldest.member.registrationNumber),
      ).toBe(false);
      await page.goto('/checkin-history');
      await expect(resultCount(page, firstPage.pagination.total)).toBeVisible();
      await page.getByLabel('Filter by activity').selectOption({ label: oldest.activity.name });
      await expect(resultCount(page, 1)).toBeVisible();
      await expect(memberRows(page, oldest.member)).toHaveCount(1);
    } finally {
      await cleanup(api, oldest, recent);
    }
  });

  test('F8.8 activity filtering and totals remain visible on mobile and translate with the page', async ({
    page,
    api,
  }) => {
    const scene = await createScene(api, 'Mobilehistory');
    try {
      await api.seedCheckin(
        scene.member.registrationNumber,
        scene.activity.id,
        eat('2015-01-06', '09:00'),
      );
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/checkin-history');
      await page.getByLabel('Filter by activity').selectOption({ label: scene.activity.name });
      await expect(resultCount(page, 1)).toBeVisible();
      await expect(page.locator('.acm-mobile-record')).toHaveCount(1);
      await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('fr');
      await expect(page.getByLabel('Filtrer par activité')).toBeVisible();
      await expect(
        page.getByRole('status').filter({ hasText: /^\s*1 résultat\s*$/ }),
      ).toBeVisible();
      await page.getByRole('combobox', { name: /Language|Langue/, exact: true }).selectOption('mg');
      await expect(page.getByLabel('Sivano araka ny hetsika')).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: /^\s*Valiny 1\s*$/ })).toBeVisible();
    } finally {
      await cleanup(api, scene);
    }
  });
});
