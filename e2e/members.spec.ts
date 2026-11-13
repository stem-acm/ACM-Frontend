import { Page } from '@playwright/test';
import { ApiHelper, Member, MemberInput, uniqueSuffix } from './fixtures/api';
import { API_ORIGIN, APP_API_ORIGIN } from './fixtures/env';
import { installFakeCamera } from './fixtures/fake-camera';
import { pngDataUrl, pngImage } from './fixtures/images';
import { expect, test } from './fixtures/test';

/** Rows per page of the members list (MembersComponent.pageSize). */
const PAGE_SIZE = 100;
/** Uploads as the page addresses them (the frontend's API origin). */
const UPLOADS_URL = `${APP_API_ORIGIN}/uploads`;

/** Name as the members table writes it: LASTNAME Firstname. */
function tableName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${(member.lastName ?? '').toUpperCase()} ${member.firstName}`;
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

function memberRow(page: Page, member: Pick<Member, 'firstName' | 'lastName'>) {
  return bodyRows(page).filter({ hasText: tableName(member) });
}

/** "Page X of Y" of the desktop pagination bar (the mobile one is hidden). */
function pageIndicator(page: Page, current: number, total: number) {
  return page.getByText(`Page ${current} of ${total}`, { exact: true }).filter({ visible: true });
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search for members' });
}

function resultCount(page: Page, total: number) {
  return page.getByRole('status').getByText(total === 1 ? '1 result' : `${total} results`, {
    exact: true,
  });
}

/** The add-member form (a form with role dialog). */
function memberForm(page: Page) {
  return page.getByRole('dialog', { name: 'New Member' });
}

async function findMembersByLastName(api: ApiHelper, lastName: string): Promise<Member[]> {
  const { data } = await api.getPage<Member>(
    `members?limit=100&search=${encodeURIComponent(lastName)}`,
  );
  return data.filter(m => m.lastName === lastName);
}

async function deleteMembersByLastName(api: ApiHelper, lastName: string): Promise<void> {
  for (const member of await findMembersByLastName(api, lastName)) {
    await api.deleteMember(member.registrationNumber);
  }
}

/** Fills every field of the add-member form. */
async function fillMemberForm(page: Page, values: MemberInput) {
  const form = memberForm(page);
  await form.getByLabel('First Name').fill(values.firstName);
  await form.getByLabel('Last Name').fill(values.lastName ?? '');
  await form.getByLabel('Title').selectOption(values.title ?? '');
  await form.getByLabel('Birthday').fill(values.birthDate ?? '');
  await form.getByLabel('Place of birth').fill(values.birthPlace ?? '');
  await form.getByLabel('Address').fill(values.address ?? '');
  await form.getByLabel('Phone Number').fill(values.phoneNumber ?? '');
  await form.getByLabel('Occupation').selectOption(values.occupation ?? '');
  await form.getByLabel('Place of Work / Study').fill(values.studyOrWorkPlace ?? '');
  await form.getByLabel('Join date').fill(values.joinDate ?? '');
}

function newMemberValues(): MemberInput {
  const suffix = uniqueSuffix();
  return {
    firstName: 'Formfirst',
    lastName: `Form${suffix}`,
    title: 'Miss',
    gender: 'female',
    birthDate: '1999-08-17',
    birthPlace: 'Antananarivo',
    address: `${suffix} Form avenue`,
    occupation: 'employee',
    phoneNumber: '0329876543',
    studyOrWorkPlace: `Form place ${suffix}`,
    joinDate: '2025-01-20',
  };
}

function pickMemberInput(member: Member): MemberInput {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    title: member.title,
    gender: member.gender,
    birthDate: member.birthDate,
    birthPlace: member.birthPlace,
    address: member.address,
    occupation: member.occupation,
    phoneNumber: member.phoneNumber,
    studyOrWorkPlace: member.studyOrWorkPlace,
    joinDate: member.joinDate,
  };
}

test.describe('F3 Members', () => {
  test('F3.1 the list shows the seeded members and pagination moves to the next page and back', async ({
    page,
    api,
  }) => {
    const before = await api.getPage<Member>('members?limit=1');
    const toCreate = Math.max(1, PAGE_SIZE + 1 - before.pagination.total);
    const prefix = `Page${uniqueSuffix()}`;
    const created: Member[] = [];
    try {
      for (let i = 0; i < toCreate; i++) {
        created.push(await api.createMember({ firstName: 'Pager', lastName: `${prefix}n${i}` }));
      }
      const firstPage = await api.getPage<Member>(`members?limit=${PAGE_SIZE}&offset=0`);
      const secondPage = await api.getPage<Member>(
        `members?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}`,
      );
      const total = firstPage.pagination.total;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      expect(total, 'more members than one page').toBeGreaterThan(PAGE_SIZE);
      const seeded = firstPage.data.filter(m => !m.lastName?.startsWith(prefix)).slice(0, 4);

      await page.goto('/members');

      await expect(resultCount(page, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      for (const member of seeded) {
        await expect(memberRow(page, member)).toHaveCount(1);
      }
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await expect(pageIndicator(page, 2, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(secondPage.data.length);
      await expect(memberRow(page, secondPage.data[0])).toHaveCount(1);
      await expect(memberRow(page, seeded[0])).toHaveCount(0);

      await page.getByRole('button', { name: 'Previous' }).click();
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(memberRow(page, seeded[0])).toHaveCount(1);
      await expect(memberRow(page, secondPage.data[0])).toHaveCount(0);
    } finally {
      for (const member of created) {
        await api.deleteMember(member.registrationNumber);
      }
    }
  });

  test('F3.2 search by name lists only matching members and clearing it restores the full list', async ({
    page,
    api,
  }) => {
    const token = `Srch${uniqueSuffix()}`;
    const match = await api.createMember({ firstName: 'Finder', lastName: `${token}x` });
    const other = await api.createMember({ firstName: 'Other' });
    try {
      const all = await api.getPage<Member>(`members?limit=${PAGE_SIZE}`);

      await page.goto('/members');
      await expect(resultCount(page, all.pagination.total)).toBeVisible();

      await searchBox(page).fill(token);
      await expect(resultCount(page, 1)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(1);
      await expect(memberRow(page, match)).toHaveCount(1);

      await searchBox(page).clear();
      await expect(resultCount(page, all.pagination.total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(all.data.length);
      await expect(memberRow(page, match)).toHaveCount(1);
      await expect(memberRow(page, other)).toHaveCount(1);
    } finally {
      await api.deleteMember(match.registrationNumber);
      await api.deleteMember(other.registrationNumber);
    }
  });

  test('F3.3 the study-place filter lists only members of the chosen place', async ({
    page,
    api,
  }) => {
    const place = `Filterplace ${uniqueSuffix()}`;
    const inPlace = [
      await api.createMember({ firstName: 'Placeone', studyOrWorkPlace: place }),
      await api.createMember({ firstName: 'Placetwo', studyOrWorkPlace: place }),
    ];
    const elsewhere = await api.createMember({ firstName: 'Elsewhere' });
    try {
      await page.goto('/members');
      await expect(memberRow(page, elsewhere)).toHaveCount(1);

      await page.getByRole('button', { name: 'Place of Work / Study' }).click();
      await page.getByPlaceholder('Search study/workplace...').fill(place);
      await page.getByRole('checkbox', { name: new RegExp(`^\\s*${place}\\s*$`, 'i') }).check();

      await expect(resultCount(page, 2)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(2);
      for (const member of inPlace) {
        await expect(memberRow(page, member)).toHaveCount(1);
      }
      for (const row of await bodyRows(page).all()) {
        await expect(row.getByRole('cell').nth(2)).toHaveText(place);
      }
      await expect(memberRow(page, elsewhere)).toHaveCount(0);
    } finally {
      for (const member of [...inPlace, elsewhere]) {
        await api.deleteMember(member.registrationNumber);
      }
    }
  });

  test('F3.4 creating a member without photo lists it and stores the same values in the API', async ({
    page,
    api,
  }) => {
    const values = newMemberValues();
    try {
      await page.goto('/members');
      await page.getByRole('button', { name: 'New Member' }).click();
      await fillMemberForm(page, values);
      await memberForm(page).getByRole('button', { name: 'Add member' }).click();

      await expect(memberForm(page)).toBeHidden();
      await searchBox(page).fill(values.lastName as string);
      await expect(memberRow(page, values)).toHaveCount(1);

      const stored = await findMembersByLastName(api, values.lastName as string);
      expect(stored).toHaveLength(1);
      expect(pickMemberInput(stored[0])).toEqual(values);
      expect(stored[0].profileImage).toBeNull();
    } finally {
      await deleteMembersByLastName(api, values.lastName as string);
    }
  });

  test('F3.5 creating a member with an uploaded photo shows that photo on the profile', async ({
    page,
    api,
  }) => {
    const values = newMemberValues();
    try {
      await page.goto('/members');
      await page.getByRole('button', { name: 'New Member' }).click();
      await fillMemberForm(page, values);
      await memberForm(page)
        .getByLabel('Import a photo')
        .setInputFiles({ name: 'member.png', mimeType: 'image/png', buffer: pngImage() });
      await memberForm(page).getByRole('button', { name: 'Add member' }).click();

      await expect(memberForm(page)).toBeHidden();
      await searchBox(page).fill(values.lastName as string);
      await expect(memberRow(page, values)).toHaveCount(1);

      const stored = await findMembersByLastName(api, values.lastName as string);
      expect(stored).toHaveLength(1);
      expect(stored[0].profileImage, 'stored photo reference').toBeTruthy();
      const photoUrl = `${UPLOADS_URL}/${stored[0].profileImage}`;

      // The request is served by the throwaway API: match the path, not the origin.
      const photoPath = `/uploads/${stored[0].profileImage}`;
      const photoResponse = page.waitForResponse(
        response => new URL(response.url()).pathname === photoPath,
      );
      await page.goto(`/profil/${stored[0].registrationNumber}`);
      expect((await photoResponse).status()).toBe(200);
      // The profile image has no accessible name: located by its source.
      const photo = page.locator(`img[src="${photoUrl}"]`);
      await expect(photo).toBeVisible();
      await expect
        .poll(() => photo.evaluate(img => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    } finally {
      await deleteMembersByLastName(api, values.lastName as string);
    }
  });

  test('F3.6 creating a member with a camera photo stores a photo', async ({ page, api }) => {
    const values = newMemberValues();
    await installFakeCamera(page, pngDataUrl(pngImage(64, 64, [20, 160, 60], [240, 200, 20])));
    try {
      await page.goto('/members');
      await page.getByRole('button', { name: 'New Member' }).click();
      await fillMemberForm(page, values);
      await memberForm(page).getByRole('button', { name: 'Take a photo' }).click();
      // The camera preview has no accessible handle: the video element is located by tag.
      // Capture needs a frame, as a user waits for the picture to appear.
      const preview = page.locator('video');
      await expect
        .poll(() => preview.evaluate(video => (video as HTMLVideoElement).videoWidth))
        .toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Capture' }).click();
      await expect(memberForm(page).getByRole('button', { name: 'Remove photo' })).toBeVisible();
      await memberForm(page).getByRole('button', { name: 'Add member' }).click();

      await expect(memberForm(page)).toBeHidden();
      const stored = await findMembersByLastName(api, values.lastName as string);
      expect(stored).toHaveLength(1);
      expect(stored[0].profileImage, 'stored photo reference').toBeTruthy();
      const photo = await page.request.get(`${API_ORIGIN}/uploads/${stored[0].profileImage}`);
      expect(photo.status()).toBe(200);
      expect(photo.headers()['content-type']).toMatch(/^image\//);
    } finally {
      await deleteMembersByLastName(api, values.lastName as string);
    }
  });

  test('F3.7 a required field left empty blocks the form with a validation message', async ({
    page,
    api,
  }) => {
    const values = { ...newMemberValues(), firstName: '' };
    const memberPosts: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/members\/?$/.test(request.url())) {
        memberPosts.push(request.url());
      }
    });
    try {
      await page.goto('/members');
      await page.getByRole('button', { name: 'New Member' }).click();
      await fillMemberForm(page, values);
      await memberForm(page).getByRole('button', { name: 'Add member' }).click();

      await expect(memberForm(page).getByText('This field is required.')).toBeVisible();
      await expect(memberForm(page)).toBeVisible();
      expect(memberPosts, 'no POST /api/members sent').toEqual([]);
      expect(await findMembersByLastName(api, values.lastName as string)).toHaveLength(0);
    } finally {
      await deleteMembersByLastName(api, values.lastName as string);
    }
  });

  test('F3.8 deleting a member from the list removes the row and the API returns 404', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Deleteme' });
    try {
      await page.goto('/members');
      await searchBox(page).fill(member.lastName as string);
      // The new member is already on the unfiltered first page: wait for the
      // debounced search to reload the table, or the reload closes the modal.
      await expect(resultCount(page, 1)).toBeVisible();
      const row = memberRow(page, member);
      await expect(row).toHaveCount(1);

      await row.getByRole('button', { name: 'Delete' }).click();
      // The confirmation modal has no dialog role: located by its title.
      const modal = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: 'Delete Member' }) })
        .filter({ has: page.getByRole('button', { name: 'Cancel' }) })
        .last();
      await modal.getByRole('button', { name: 'Delete' }).click();

      await expect(row).toHaveCount(0);
      await expect.poll(() => api.status(`members/${member.registrationNumber}`)).toBe(404);
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
    }
  });

  test('F3.9 printing the cards of two selected members opens the viewer with exactly those two', async ({
    page,
    api,
  }) => {
    const token = `Card${uniqueSuffix()}`;
    const members = [
      await api.createMember({ firstName: 'Cardone', lastName: `${token}a` }),
      await api.createMember({ firstName: 'Cardtwo', lastName: `${token}b` }),
    ];
    try {
      await page.goto('/members');
      await searchBox(page).fill(token);
      await expect(bodyRows(page)).toHaveCount(2);
      for (const member of members) {
        // The row checkbox has no accessible name: located inside the member's row.
        await memberRow(page, member).getByRole('checkbox').check();
      }

      await page.getByRole('button', { name: 'Print cards (2)' }).click();

      await expect(
        page.getByRole('heading', { name: 'Membership Card', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'MEMBERSHIP CARD', exact: true })).toHaveCount(
        2,
      );
      for (const member of members) {
        await expect(
          page.getByText(`${member.firstName} ${member.lastName}`, { exact: true }),
        ).toBeVisible();
      }
    } finally {
      for (const member of members) {
        await api.deleteMember(member.registrationNumber);
      }
    }
  });
});
