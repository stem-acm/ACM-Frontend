import { Page } from '@playwright/test';
import { Activity, ApiHelper, Checkin, Member } from './fixtures/api';
import { atLocalHour } from './fixtures/clock';
import { APP_API_ORIGIN, BASE_URL } from './fixtures/env';
import { expect, test } from './fixtures/test';

/** A fixed open day, independent of the runner's date and time zone. */
const DASHBOARD_DAY = '2026-10-20';
const A_TUESDAY_AT_NINE_EAT = new Date(`${DASHBOARD_DAY}T06:00:00.000Z`);

async function firstSeededActivity(api: ApiHelper): Promise<Activity> {
  const { data } = await api.getPage<Activity>('activities?limit=1');
  expect(data.length, 'at least one seeded activity').toBeGreaterThan(0);
  return data[0];
}

/** Name as the check-ins table writes it: LASTNAME Firstname. */
function tableName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${member.lastName?.toUpperCase()} ${member.firstName}`;
}

function checkinsTable(page: Page) {
  return page.getByRole('table');
}

function checkinRow(page: Page, checkin: Checkin) {
  return checkinsTable(page)
    .getByRole('row')
    .filter({ hasText: tableName(checkin.Member as Member) })
    .filter({ hasText: checkin.Activity?.name as string });
}

test.describe('F2 Dashboard', () => {
  test('F2.1 statistic cards show the member and activity totals of the API', async ({
    page,
    api,
  }) => {
    const members = await api.getPage<Member>('members?limit=1');
    const activities = await api.getPage<Activity>('activities?limit=1');

    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Members', exact: false })).toHaveAccessibleName(
      new RegExp(`^\\s*${members.pagination.total}\\s+Members\\s*$`),
    );
    await expect(page.getByRole('link', { name: 'Activities', exact: false })).toHaveAccessibleName(
      new RegExp(`^\\s*${activities.pagination.total}\\s+Activities\\s*$`),
    );
  });

  test('F2.2 the daily check-ins table lists the requested day with member and activity', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Dash' });
    try {
      const activity = await firstSeededActivity(api);
      await api.seedCheckin(member.registrationNumber, activity.id, A_TUESDAY_AT_NINE_EAT);
      const otherDay = await api.seedCheckin(
        member.registrationNumber,
        activity.id,
        new Date('2026-10-21T06:00:00.000Z'),
      );
      const daily = (await api.get<{ checkins: Checkin[] }>(`dashboard?date=${DASHBOARD_DAY}`))
        .checkins;
      expect(daily.filter(c => c.registrationNumber === member.registrationNumber)).toHaveLength(1);
      expect(daily.map(c => c.id)).not.toContain(otherDay.id);

      await page.clock.setFixedTime(A_TUESDAY_AT_NINE_EAT);
      // Exercise the real dated API response, keeping the shared routing to the
      // disposable backend. Never create check-ins for the runner's current day:
      // Sundays and Mondays are correctly rejected by the application's rules.
      await page.route(
        url => url.origin === APP_API_ORIGIN && url.pathname === '/api/dashboard',
        route => {
          const url = new URL(route.request().url());
          url.searchParams.set('date', DASHBOARD_DAY);
          return route.fallback({ url: url.toString() });
        },
      );
      const responsePromise = page.waitForResponse(
        response => new URL(response.url()).pathname === '/api/dashboard',
      );
      await page.goto('/');
      const response = await responsePromise;
      expect(response.ok()).toBe(true);
      expect(new URL(response.url()).searchParams.get('date')).toBe(DASHBOARD_DAY);

      const bodyRows = checkinsTable(page).locator('tbody').getByRole('row');
      await expect(bodyRows).toHaveCount(daily.length);
      for (const checkin of daily) {
        await expect(checkinRow(page, checkin)).toHaveCount(1);
      }
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test('F2.3 the member card links to /members and the activity card links to /activity', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Members', exact: false }).click();
    await expect(page).toHaveURL(`${BASE_URL}/members`);

    await page.goto('/');
    await page.getByRole('link', { name: 'Activities', exact: false }).click();
    await expect(page).toHaveURL(`${BASE_URL}/activity`);
  });

  test('F2.4 a check-in created through the API while the page is open appears without reload', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Live' });
    try {
      const activity = await firstSeededActivity(api);
      const sseOpened = page.waitForResponse(
        response => response.url().includes('/sse/checkins') && response.ok(),
      );
      await page.goto('/');
      await sseOpened;
      await expect(checkinsTable(page)).toBeVisible();
      // A marker that a reload would erase.
      await page.evaluate(
        () => ((window as unknown as { e2eNoReload: boolean }).e2eNoReload = true),
      );

      // A real scan through the API (it sends the live event), at 09:xx in the time zone
      // of the app: open on every day of the default schedule.
      await atLocalHour(api, 9, async () => {
        const checkin = await api.scanCheckin(member.registrationNumber, activity.id);

        await expect(
          checkinRow(page, { ...checkin, Member: member, Activity: activity }),
        ).toHaveCount(1);
      });
      expect(
        await page.evaluate(() => (window as unknown as { e2eNoReload?: boolean }).e2eNoReload),
        'the page was not reloaded',
      ).toBe(true);
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });
});
