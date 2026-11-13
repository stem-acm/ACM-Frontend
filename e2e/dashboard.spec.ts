import { Page } from '@playwright/test';
import { Activity, ApiHelper, Checkin, Member } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { expect, test } from './fixtures/test';

/**
 * 09:00 EAT (06:00 UTC) of the current day: inside an allowed check-in slot from
 * Tuesday to Saturday, and inside "today" for the API, which counts days in UTC.
 */
function todayAtNineEat(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
}

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

  test("F2.2 today's check-ins table lists today's check-ins of the API with member and activity", async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Dash' });
    try {
      const activity = await firstSeededActivity(api);
      await api.createCheckin(member.registrationNumber, activity.id, todayAtNineEat());
      const today = (await api.get<{ checkins: Checkin[] }>('dashboard')).checkins;
      expect(
        today.some(c => c.registrationNumber === member.registrationNumber),
        'the test check-in is in the API list of today',
      ).toBeTruthy();

      await page.goto('/');

      const bodyRows = checkinsTable(page).locator('tbody').getByRole('row');
      await expect(bodyRows).toHaveCount(today.length);
      for (const checkin of today) {
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

      const checkin = await api.createCheckin(
        member.registrationNumber,
        activity.id,
        todayAtNineEat(),
      );

      await expect(
        checkinRow(page, { ...checkin, Member: member, Activity: activity }),
      ).toHaveCount(1);
      expect(
        await page.evaluate(() => (window as unknown as { e2eNoReload?: boolean }).e2eNoReload),
        'the page was not reloaded',
      ).toBe(true);
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });
});
