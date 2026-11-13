import { Page } from '@playwright/test';
import { ApiHelper, Member, Page as ApiPage, uniqueSuffix } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { printCalls, stubPrint } from './fixtures/print';
import { expect, test } from './fixtures/test';

/** Rows per page of the volunteers list (VolunteerComponent.pageSize). */
const PAGE_SIZE = 100;

interface Volunteer {
  id: number;
  registrationNumber: number | null;
  role: string | null;
  joinDate: string | null;
  expirationDate: string | null;
  Member?: Member | null;
}

/** "Tuesday 10 June 2025", as the table writes a date (DateUtil.formatDateFull). */
function tableDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const monthName = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${weekday} ${String(day).padStart(2, '0')} ${monthName} ${year}`;
}

/** "LASTNAME Firstname", as the table writes the member. */
function tableName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${(member.lastName ?? '').toUpperCase()} ${member.firstName}`;
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

function volunteerRow(page: Page, volunteer: Volunteer) {
  return bodyRows(page)
    .filter({
      has: page.getByRole('rowheader').filter({ hasText: tableName(volunteer.Member as Member) }),
    })
    .filter({ has: page.getByRole('cell').getByText(String(volunteer.id), { exact: true }) });
}

function memberRows(page: Page, member: Member) {
  return bodyRows(page).filter({
    has: page.getByRole('rowheader').filter({ hasText: tableName(member) }),
  });
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search for volunteer' });
}

function showing(page: Page, from: number, to: number, total: number) {
  return page.getByText(`Showing ${from} to ${to} of ${total} results`, { exact: true });
}

/** "Page X of Y" of the desktop pagination bar (the mobile one is hidden). */
function pageIndicator(page: Page, current: number, total: number) {
  return page.getByText(`Page ${current} of ${total}`, { exact: true }).filter({ visible: true });
}

/** The add form has no dialog role and no accessible name: located by its title. */
function addForm(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('heading', { name: 'New Volunteer' }) });
}

/**
 * A member card of the add form. The selection checkbox has no accessible
 * name (its label is empty): the card is located by its component and its name.
 */
function memberCard(page: Page, member: Member) {
  return addForm(page)
    .locator('app-card')
    .filter({
      has: page.getByRole('heading', { name: `${member.firstName} ${member.lastName}` }),
    });
}

/**
 * Selects a member card as a user does: an empty label laid over the card
 * toggles the checkbox, so the click goes to that label.
 */
async function selectMemberCard(page: Page, member: Member) {
  const card = memberCard(page, member);
  await card.locator('label').click();
  await expect(card.getByRole('checkbox')).toBeChecked();
}

async function memberVolunteers(api: ApiHelper, member: Member): Promise<Volunteer[]> {
  const { data } = await api.getPage<Volunteer>(
    `volunteers?limit=100&search=${encodeURIComponent(member.lastName ?? '')}`,
  );
  return data.filter(v => v.registrationNumber === member.registrationNumber);
}

async function createVolunteer(
  api: ApiHelper,
  member: Member,
  joinDate = '2025-03-04',
  expirationDate = '2026-03-04',
): Promise<Volunteer> {
  const created = await api.post<Volunteer>('volunteers', {
    registrationNumber: member.registrationNumber,
    role: 'Volunteer',
    joinDate,
    expirationDate,
  });
  return { ...created, Member: member };
}

/** Removes the test volunteers of a member through the API, then the member. */
async function cleanup(api: ApiHelper, ...members: Member[]): Promise<void> {
  for (const member of members) {
    if ((await api.status(`members/${member.registrationNumber}`)) !== 200) continue;
    // The API returns at most 100 rows per request: repeat until none is left.
    for (let left = await memberVolunteers(api, member); left.length > 0; ) {
      for (const volunteer of left) {
        await api.delete(`volunteers/${volunteer.id}`);
      }
      left = await memberVolunteers(api, member);
    }
    await api.deleteMember(member.registrationNumber);
  }
}

test.describe('F9 Volunteers', () => {
  test('F9.1 the list shows the seeded volunteers, search and clear work, pagination moves to the next page and back', async ({
    page,
    api,
  }) => {
    const before = await api.getPage<Volunteer>('volunteers?limit=100');
    const seeded = before.data.filter(v => v.Member).slice(0, 2);
    expect(seeded.length, 'seeded volunteers exist').toBeGreaterThan(0);
    const searched = await api.createMember({ firstName: 'Volsearch' });
    const filler = await api.createMember({ firstName: 'Volfiller' });
    try {
      const searchedVolunteer = await createVolunteer(api, searched);
      const total = before.pagination.total + 1;

      await page.goto('/volunteer');
      await expect(showing(page, 1, total, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(total);
      for (const volunteer of seeded) {
        await expect(volunteerRow(page, volunteer)).toHaveCount(1);
      }

      await searchBox(page).fill(searched.lastName ?? '');
      await expect(bodyRows(page)).toHaveCount(1);
      await expect(volunteerRow(page, searchedVolunteer)).toHaveCount(1);
      await expect(showing(page, 1, 1, 1)).toBeVisible();

      await searchBox(page).clear();
      await expect(showing(page, 1, total, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(total);
      await expect(volunteerRow(page, seeded[0])).toHaveCount(1);

      // More volunteers than one page: one test member volunteers several times.
      const toCreate = Math.max(1, PAGE_SIZE + 1 - total);
      await api.post<Volunteer[]>(
        'volunteers',
        Array.from({ length: toCreate }, () => ({
          registrationNumber: filler.registrationNumber,
          role: 'Volunteer',
          joinDate: '2025-01-07',
          expirationDate: '2026-01-07',
        })),
      );
      const firstPage: ApiPage<Volunteer> = await api.getPage<Volunteer>(
        `volunteers?limit=${PAGE_SIZE}&offset=0`,
      );
      const bigTotal = firstPage.pagination.total;
      const totalPages = Math.ceil(bigTotal / PAGE_SIZE);
      expect(bigTotal, 'more volunteers than one page').toBeGreaterThan(PAGE_SIZE);

      await page.reload();
      await expect(showing(page, 1, PAGE_SIZE, bigTotal)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(volunteerRow(page, seeded[0])).toHaveCount(1);

      await page.getByRole('button', { name: 'Next' }).filter({ visible: true }).click();
      await expect(pageIndicator(page, 2, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(Math.min(PAGE_SIZE, bigTotal - PAGE_SIZE));
      await expect(volunteerRow(page, seeded[0])).toHaveCount(0);

      await page.getByRole('button', { name: 'Previous' }).filter({ visible: true }).click();
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(volunteerRow(page, seeded[0])).toHaveCount(1);
    } finally {
      await cleanup(api, searched, filler);
    }
  });

  test('F9.2 adding a volunteer from an existing member lists it and stores it in the API, linked to that member', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({
      firstName: 'Voladd',
      lastName: `Vol${uniqueSuffix()}`,
    });
    const joinDate = '2025-09-02';
    const expirationDate = '2026-09-01';
    try {
      await page.goto('/volunteer');
      await page.getByRole('button', { name: 'New Volunteer' }).click();
      const form = addForm(page);
      await form.getByLabel('Join date').fill(joinDate);
      await form.getByLabel('Expiration Date').fill(expirationDate);
      await form.getByLabel('Role').fill('Mentor');
      await form.getByPlaceholder('eg: John').fill(member.lastName ?? '');
      await selectMemberCard(page, member);
      await form.getByRole('button', { name: 'Add volunteer' }).click();

      await expect(form).toBeHidden();
      const stored = await memberVolunteers(api, member);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        registrationNumber: member.registrationNumber,
        joinDate,
        expirationDate,
      });
      expect(stored[0].Member?.registrationNumber).toBe(member.registrationNumber);

      await searchBox(page).fill(member.lastName ?? '');
      const row = volunteerRow(page, { ...stored[0], Member: member });
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('rowheader')).toContainText(String(member.registrationNumber));
      await expect(row.getByRole('cell')).toHaveText([
        String(stored[0].id),
        tableDate(joinDate),
        tableDate(expirationDate),
        /Certificate\s*View profil/,
      ]);
    } finally {
      await cleanup(api, member);
    }
  });

  test('F9.3 submitting without a selected member or without dates creates nothing and shows a message', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({
      firstName: 'Volinvalid',
      lastName: `Vol${uniqueSuffix()}`,
    });
    const volunteerPosts: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/volunteers\/?$/i.test(request.url())) {
        volunteerPosts.push(request.url());
      }
    });
    try {
      const totalBefore = (await api.getPage<Volunteer>('volunteers?limit=1')).pagination.total;
      await page.goto('/volunteer');
      await page.getByRole('button', { name: 'New Volunteer' }).click();
      const form = addForm(page);

      // Dates, no member selected.
      await form.getByLabel('Join date').fill('2025-09-02');
      await form.getByLabel('Expiration Date').fill('2026-09-01');
      await form.getByLabel('Role').fill('Mentor');
      await form.getByRole('button', { name: 'Add volunteer' }).click();

      await expect(form.getByText('Please select a member.')).toBeVisible();
      await expect(form).toBeVisible();
      expect(volunteerPosts, 'no POST /api/volunteers sent').toEqual([]);
      expect((await api.getPage<Volunteer>('volunteers?limit=1')).pagination.total).toBe(
        totalBefore,
      );

      // Member selected, no dates.
      await form.getByLabel('Join date').fill('');
      await form.getByLabel('Expiration Date').fill('');
      await form.getByPlaceholder('eg: John').fill(member.lastName ?? '');
      await selectMemberCard(page, member);
      await form.getByRole('button', { name: 'Add volunteer' }).click();

      await expect(
        form.getByText('Please fill in both Join Date and Expiration Date.'),
      ).toBeVisible();
      await expect(form).toBeVisible();
      expect(volunteerPosts, 'no POST /api/volunteers sent').toEqual([]);
      expect(await memberVolunteers(api, member)).toHaveLength(0);
    } finally {
      await cleanup(api, member);
    }
  });

  test('F9.4 the member link of a row opens the member profile', async ({ page, api }) => {
    const member = await api.createMember({ firstName: 'Vollink' });
    try {
      const volunteer = await createVolunteer(api, member);

      await page.goto('/volunteer');
      await searchBox(page).fill(member.lastName ?? '');
      await volunteerRow(page, volunteer).getByRole('link', { name: 'View profil' }).click();

      await expect(page).toHaveURL(`${BASE_URL}/profil/${member.registrationNumber}`);
      const lastName = member.lastName ?? '';
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `${lastName.charAt(0).toUpperCase()}${lastName.slice(1)} ${member.firstName}`,
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await cleanup(api, member);
    }
  });

  test('F9.5 the certificate link opens the certificate of this volunteer with its name', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Volcert' });
    try {
      const volunteer = await createVolunteer(api, member);

      await page.goto('/volunteer');
      await searchBox(page).fill(member.lastName ?? '');
      await memberRows(page, member).getByRole('button', { name: 'Certificate' }).click();

      await expect(page).toHaveURL(`${BASE_URL}/volunteer/${volunteer.id}/certificate`);
      await expect(
        page.getByRole('heading', {
          level: 3,
          name: `${member.firstName} ${member.lastName}`,
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await cleanup(api, member);
    }
  });

  test('F9.6 the certificate print button calls window.print and the export downloads a .pdf file', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Volexport' });
    await stubPrint(page);
    try {
      const volunteer = await createVolunteer(api, member);

      await page.goto(`/volunteer/${volunteer.id}/certificate`);
      await expect(
        page.getByRole('heading', { level: 3, name: `${member.firstName} ${member.lastName}` }),
      ).toBeVisible();

      expect(await printCalls(page), 'print not called before the click').toBe(0);
      await page.getByRole('button', { name: 'Print on paper' }).click();
      await expect.poll(() => printCalls(page)).toBe(1);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download PDF' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    } finally {
      await cleanup(api, member);
    }
  });
});
