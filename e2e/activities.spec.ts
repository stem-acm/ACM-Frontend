import { Page } from '@playwright/test';
import { Activity, ActivityInput, ApiHelper, uniqueSuffix } from './fixtures/api';
import { expect, test } from './fixtures/test';

/** Rows per page of the activities list (ActivityComponent.pageSize). */
const PAGE_SIZE = 100;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

function activityRow(page: Page, name: string) {
  return bodyRows(page).filter({
    has: page.getByRole('rowheader').getByText(name, { exact: true }),
  });
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search for activities' });
}

/** "Page X of Y" of the desktop pagination bar (the mobile one is hidden). */
function pageIndicator(page: Page, current: number, total: number) {
  return page.getByText(`Page ${current} of ${total}`, { exact: true }).filter({ visible: true });
}

/** "Showing A to B of T results" of the desktop pagination bar. */
function showing(page: Page, from: number, to: number, total: number) {
  return page.getByText(`Showing ${from} to ${to} of ${total} results`, { exact: true });
}

/** The activity form (a form with role dialog), titled "New Activity" or "Update Activity". */
function activityForm(page: Page, title: 'New Activity' | 'Update Activity') {
  return page.getByRole('dialog', { name: title });
}

/** The delete confirmation modal has no dialog role: located by its title. */
function deleteModal(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Delete Activity' }) })
    .filter({ has: page.getByRole('button', { name: 'Cancel' }) })
    .last();
}

async function findActivitiesByName(api: ApiHelper, name: string): Promise<Activity[]> {
  const { data } = await api.getPage<Activity>(
    `activities?limit=100&search=${encodeURIComponent(name)}`,
  );
  return data.filter(a => a.name === name);
}

async function deleteActivitiesByName(api: ApiHelper, name: string): Promise<void> {
  for (const activity of await findActivitiesByName(api, name)) {
    await api.deleteActivity(activity.id);
  }
}

function pickActivityInput(activity: Activity): ActivityInput {
  return {
    name: activity.name,
    description: activity.description ?? null,
    emoji: activity.emoji ?? null,
    isPeriodic: activity.isPeriodic as boolean,
    dayOfWeek: activity.dayOfWeek ?? null,
    startTime: activity.startTime as string,
    endTime: activity.endTime as string,
    startDate: activity.startDate ?? null,
    endDate: activity.endDate ?? null,
  };
}

/** Fills the activity form for a periodic activity. */
async function fillActivityForm(
  page: Page,
  title: 'New Activity' | 'Update Activity',
  values: Pick<ActivityInput, 'name' | 'description' | 'dayOfWeek' | 'startTime' | 'endTime'> & {
    emoji?: string;
  },
) {
  const form = activityForm(page, title);
  await form.getByLabel('Activity name').fill(values.name);
  await form.getByLabel('Description').fill(values.description ?? '');
  if (values.emoji) {
    await form.getByRole('button', { name: 'Choose Emoji' }).click();
    await form.getByRole('button', { name: values.emoji, exact: true }).click();
  }
  await form.getByLabel('Day of Week').selectOption(values.dayOfWeek ?? '');
  await form.getByLabel('Start Time').fill(values.startTime.slice(0, 5));
  await form.getByLabel('End Time').fill(values.endTime.slice(0, 5));
}

/** The values an activity row shows, cell by cell after the name. */
async function expectRowValues(page: Page, values: ActivityInput) {
  const row = activityRow(page, values.name);
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('rowheader')).toHaveText(
    new RegExp(`^${escapeRegExp(values.emoji ?? '😊')}\\s*${escapeRegExp(values.name)}$`),
  );
  const day = values.dayOfWeek as string;
  await expect(row.getByRole('cell')).toHaveText([
    values.description ?? '',
    values.isPeriodic ? 'Yes' : 'No',
    day.charAt(0).toUpperCase() + day.slice(1),
    values.startDate ?? 'N/A',
    values.endDate ?? 'N/A',
    values.startTime,
    values.endTime,
    /Edit\s*Delete/,
  ]);
}

test.describe('F6 Activities', () => {
  for (const mode of ['create', 'edit'] as const) {
    test(`activity names enforce the 40-character boundary on ${mode}`, async ({ page, api }) => {
      const name = `Limit${uniqueSuffix()}`.padEnd(40, 'x').slice(0, 40);
      const existing =
        mode === 'edit' ? await api.createActivity({ name: `Before${uniqueSuffix()}` }) : null;
      try {
        await page.goto('/activity');
        const title = mode === 'create' ? 'New Activity' : 'Update Activity';
        if (existing) {
          await searchBox(page).fill(existing.name);
          await expect(showing(page, 1, 1, 1)).toBeVisible();
          await activityRow(page, existing.name).getByRole('button', { name: 'Edit' }).click();
        } else {
          await page.getByRole('button', { name: 'New Activity' }).click();
        }
        await fillActivityForm(page, title, {
          name,
          description: 'Name limit',
          dayOfWeek: 'tuesday',
          startTime: '09:00',
          endTime: '10:00',
        });
        const form = activityForm(page, title);
        const input = form.getByLabel('Activity name');
        const counter = form.locator('#activity-name-count');
        await expect(counter).toHaveText('40/40');
        await input.fill('');
        await expect(counter).toHaveText('0/40');
        await input.pressSequentially('Activity');
        await expect(counter).toHaveText('8/40');
        await input.press('Backspace');
        await expect(counter).toHaveText('7/40');
        await expect(input).toHaveAttribute('maxlength', '40');
        await input.fill(name + 'x');
        await expect(input).toHaveValue(name);
        // Bypass the native cap to exercise validation of populated model values.
        await input.evaluate((element, value) => {
          const input = element as HTMLInputElement;
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }, name + 'x');
        await expect(counter).toHaveText('41/40');
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(form.getByRole('status')).toHaveText(
          'Activity name must be 40 characters or fewer.',
        );
        const writes: string[] = [];
        page.on('request', request => {
          if (
            ['POST', 'PUT', 'PATCH'].includes(request.method()) &&
            /\/api\/activities(?:\/\d+)?$/.test(new URL(request.url()).pathname)
          )
            writes.push(request.url());
        });
        // Direct submit also covers values that bypass native browser validation.
        await form.evaluate(element =>
          element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
        );
        await expect(form).toBeVisible();
        expect(writes).toEqual([]);
        await input.fill(name);
        await expect(form.getByRole('status')).toHaveCount(0);
        await form
          .getByRole('button', {
            name: mode === 'create' ? 'Add activity' : 'Update activity',
            exact: true,
          })
          .click();
        await expect(form).toBeHidden();
        expect(await findActivitiesByName(api, name)).toHaveLength(1);
      } finally {
        await deleteActivitiesByName(api, name);
        if (existing) await api.deleteActivityIfExists(existing.id);
      }
    });
  }

  test('F6.1 the list shows the activities, search and clear work, pagination moves to the next page and back', async ({
    page,
    api,
  }) => {
    const before = await api.getPage<Activity>('activities?limit=100');
    const toCreate = Math.max(1, PAGE_SIZE + 1 - before.pagination.total);
    const prefix = `Pager${uniqueSuffix()}`;
    const token = `Srch${uniqueSuffix()}`;
    const created: Activity[] = [];
    try {
      for (let i = 0; i < toCreate; i++) {
        created.push(await api.createActivity({ name: `${prefix}n${String(i).padStart(3, '0')}` }));
      }
      created.push(await api.createActivity({ name: `${token} activity` }));
      const firstPage = await api.getPage<Activity>(
        `activities?limit=${PAGE_SIZE}&offset=0&sortBy=createdAt&order=desc`,
      );
      const secondPage = await api.getPage<Activity>(
        `activities?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}&sortBy=createdAt&order=desc`,
      );
      const total = firstPage.pagination.total;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      expect(total, 'more activities than one page').toBeGreaterThan(PAGE_SIZE);

      await page.goto('/activity');

      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      for (const activity of firstPage.data.slice(0, 5)) {
        await expect(activityRow(page, activity.name)).toHaveCount(1);
      }
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await expect(pageIndicator(page, 2, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(secondPage.data.length);
      await expect(activityRow(page, secondPage.data[0].name)).toHaveCount(1);
      await expect(activityRow(page, firstPage.data[0].name)).toHaveCount(0);

      await page.getByRole('button', { name: 'Previous' }).click();
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(activityRow(page, firstPage.data[0].name)).toHaveCount(1);

      await searchBox(page).fill(token);
      await expect(bodyRows(page)).toHaveCount(1);
      await expect(activityRow(page, `${token} activity`)).toHaveCount(1);
      await expect(showing(page, 1, 1, 1)).toBeVisible();

      await searchBox(page).clear();
      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(activityRow(page, firstPage.data[0].name)).toHaveCount(1);
    } finally {
      for (const activity of created) {
        await api.deleteActivity(activity.id);
      }
    }
  });

  test('F6.2 creating an activity lists it and stores it in the API', async ({ page, api }) => {
    const suffix = uniqueSuffix();
    const values: ActivityInput = {
      name: `Created ${suffix}`,
      description: `created description ${suffix}`,
      emoji: '🚀',
      isPeriodic: true,
      dayOfWeek: 'wednesday',
      startTime: '14:00:00',
      endTime: '16:30:00',
      startDate: null,
      endDate: null,
    };
    try {
      await page.goto('/activity');
      await page.getByRole('button', { name: 'New Activity' }).click();
      await fillActivityForm(page, 'New Activity', { ...values, emoji: '🚀' });
      await activityForm(page, 'New Activity')
        .getByRole('button', { name: 'Add activity' })
        .click();

      await expect(activityForm(page, 'New Activity')).toBeHidden();
      await searchBox(page).fill(values.name);
      await expectRowValues(page, values);

      const stored = await findActivitiesByName(api, values.name);
      expect(stored).toHaveLength(1);
      expect(pickActivityInput(stored[0])).toEqual(values);
    } finally {
      await deleteActivitiesByName(api, values.name);
    }
  });

  test('F6.3 editing an activity shows the new values in the list and in the API', async ({
    page,
    api,
  }) => {
    const activity = await api.createActivity({ name: `Editme ${uniqueSuffix()}` });
    const suffix = uniqueSuffix();
    const values: ActivityInput = {
      name: `Edited ${suffix}`,
      description: `edited description ${suffix}`,
      emoji: activity.emoji ?? null,
      isPeriodic: true,
      dayOfWeek: 'friday',
      startTime: '09:15:00',
      endTime: '11:45:00',
      startDate: null,
      endDate: null,
    };
    try {
      await page.goto('/activity');
      await searchBox(page).fill(activity.name);
      await activityRow(page, activity.name).getByRole('button', { name: 'Edit' }).click();
      await expect(activityForm(page, 'Update Activity').getByLabel('Activity name')).toHaveValue(
        activity.name,
      );
      await fillActivityForm(page, 'Update Activity', values);
      await activityForm(page, 'Update Activity')
        .getByRole('button', { name: 'Update activity' })
        .click();

      await expect(activityForm(page, 'Update Activity')).toBeHidden();
      await searchBox(page).fill(values.name);
      await expectRowValues(page, values);

      expect(pickActivityInput(await api.getActivity(activity.id))).toEqual(values);
    } finally {
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F6.4 deleting an activity removes it from the list and the API returns 404', async ({
    page,
    api,
  }) => {
    const activity = await api.createActivity({ name: `Deleteme ${uniqueSuffix()}` });
    try {
      await page.goto('/activity');
      await searchBox(page).fill(activity.name);
      // This row also exists before filtering. Wait for the debounced reload,
      // which otherwise destroys the table's open confirmation dialog.
      await expect(showing(page, 1, 1, 1)).toBeVisible();
      const row = activityRow(page, activity.name);
      await expect(row).toHaveCount(1);

      await row.getByRole('button', { name: 'Delete' }).click();
      await deleteModal(page).getByRole('button', { name: 'Delete' }).click();

      await expect(row).toHaveCount(0);
      await expect.poll(() => api.status(`activities/${activity.id}`)).toBe(404);
    } finally {
      await api.deleteActivityIfExists(activity.id);
    }
  });

  test('F6.5 a required field left empty blocks the form with a validation message', async ({
    page,
    api,
  }) => {
    const description = `Unsaved description ${uniqueSuffix()}`;
    const activityPosts: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/activities\/?$/.test(request.url())) {
        activityPosts.push(request.url());
      }
    });
    try {
      await page.goto('/activity');
      await page.getByRole('button', { name: 'New Activity' }).click();
      await fillActivityForm(page, 'New Activity', {
        name: '',
        description,
        dayOfWeek: 'thursday',
        startTime: '10:00:00',
        endTime: '12:00:00',
      });
      await activityForm(page, 'New Activity')
        .getByRole('button', { name: 'Add activity' })
        .click();

      await expect(
        activityForm(page, 'New Activity').getByText('This field is required.'),
      ).toBeVisible();
      await expect(activityForm(page, 'New Activity')).toBeVisible();
      expect(activityPosts, 'no POST /api/activities sent').toEqual([]);
      const { data } = await api.getPage<Activity>('activities?limit=100');
      expect(data.filter(a => a.description === description)).toHaveLength(0);
    } finally {
      const { data } = await api.getPage<Activity>('activities?limit=100');
      for (const activity of data.filter(a => a.description === description)) {
        await api.deleteActivity(activity.id);
      }
    }
  });
});
