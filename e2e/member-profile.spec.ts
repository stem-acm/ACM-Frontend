import { Page } from '@playwright/test';
import { Member } from './fixtures/api';
import { API_URL, BASE_URL } from './fixtures/env';
import { pngImage } from './fixtures/images';
import { expect, test } from './fixtures/test';

const UPLOADS_URL = `${new URL(API_URL).origin}/uploads`;
const DEFAULT_AVATAR_URL = `${UPLOADS_URL}/user.png`;

/** Uppercases the first character, as the app's capitalize pipe does. */
function capitalize(value: string | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

/** A YYYY-MM-DD date as the profile writes it: "Saturday 03 February 2001 (25 yrs)". */
function profileDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const monthName = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
  return `${weekday} ${String(day).padStart(2, '0')} ${monthName} ${year} (${age} yrs)`;
}

/**
 * Value of a profile field. The fields are dt/dd pairs, each in its own div:
 * the pair is located by its div, the term by its label.
 */
function profileField(page: Page, label: string) {
  return page
    .locator('dl div')
    .filter({ has: page.getByRole('term').filter({ hasText: `${label} :` }) })
    .getByRole('definition');
}

/** The round profile photo has no accessible name: located by its component. */
function profilePhoto(page: Page) {
  return page.locator('app-img-round img');
}

function updateForm(page: Page) {
  return page.getByRole('dialog', { name: 'Update Member' });
}

function memberRow(page: Page, member: Member) {
  return page
    .getByRole('table')
    .locator('tbody')
    .getByRole('row')
    .filter({ hasText: `${(member.lastName ?? '').toUpperCase()} ${member.firstName}` });
}

/** Confirms the delete modal (no dialog role: located by its title). */
async function confirmDelete(page: Page) {
  await page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Delete Member' }) })
    .filter({ has: page.getByRole('button', { name: 'Cancel' }) })
    .last()
    .getByRole('button', { name: 'Delete' })
    .click();
}

test.describe('F4 Member profile', () => {
  test('F4.1 opening a member from the list shows its registration number and API values', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Profileone' });
    try {
      const stored = await api.getMember(member.registrationNumber);

      await page.goto('/members');
      await page.getByRole('searchbox', { name: 'Search for members' }).fill(member.lastName ?? '');
      await memberRow(page, member).getByRole('link', { name: 'View profil' }).click();

      await expect(page).toHaveURL(`${BASE_URL}/profil/${stored.registrationNumber}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `${capitalize(stored.lastName)} ${stored.firstName}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(profileField(page, 'Full name')).toHaveText(
        `${stored.title} ${stored.firstName} ${capitalize(stored.lastName)}`,
      );
      await expect(profileField(page, 'Occupation')).toHaveText(stored.occupation ?? '');
      await expect(profileField(page, 'Phone Contact')).toHaveText(stored.phoneNumber ?? '');
      await expect(profileField(page, 'Place of Work / Study')).toHaveText(
        stored.studyOrWorkPlace ?? '',
      );
      await expect(profileField(page, 'Date and Place of birth')).toHaveText(
        `${profileDate(stored.birthDate as string)}, in ${capitalize(stored.birthPlace)}`,
      );
      await expect(profileField(page, 'Membership date')).toHaveText(
        profileDate(stored.joinDate as string),
      );
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test('F4.2 a member without birth date and last name renders without Invalid Date, null or console error', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({
      firstName: 'Nullable',
      lastName: null,
      birthDate: null,
    });
    const consoleErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => consoleErrors.push(error.message));
    try {
      await page.goto(`/profil/${member.registrationNumber}`);

      await expect(profileField(page, 'Full name')).toContainText('Nullable');
      await expect(profileField(page, 'Phone Contact')).toHaveText(member.phoneNumber ?? '');
      const text = await page.locator('body').innerText();
      expect(text).not.toContain('Invalid Date');
      expect(text).not.toMatch(/\bnull\b/);
      expect(consoleErrors).toEqual([]);
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test('F4.3 editing a field from the profile shows the new value on the profile and in the API', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Editme' });
    const newPhone = `03${Date.now().toString().slice(-8)}`;
    try {
      await page.goto(`/profil/${member.registrationNumber}`);
      await expect(profileField(page, 'Phone Contact')).toHaveText(member.phoneNumber ?? '');

      await page.getByRole('button', { name: 'Edit Member' }).click();
      await updateForm(page).getByLabel('Phone Number').fill(newPhone);
      await updateForm(page).getByRole('button', { name: 'Update member' }).click();

      await expect(updateForm(page)).toBeHidden();
      await expect(profileField(page, 'Phone Contact')).toHaveText(newPhone);
      expect((await api.getMember(member.registrationNumber)).phoneNumber).toBe(newPhone);
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test('F4.4 replacing the photo shows the new photo; removing it shows the default avatar and clears the API photo', async ({
    page,
    api,
  }) => {
    const member = await api.createMemberWithPhoto(pngImage(64, 64, [200, 30, 30], [30, 30, 200]), {
      firstName: 'Photome',
    });
    try {
      expect(member.profileImage, 'initial photo').toBeTruthy();
      await page.goto(`/profil/${member.registrationNumber}`);
      await expect(profilePhoto(page)).toHaveAttribute(
        'src',
        `${UPLOADS_URL}/${member.profileImage}`,
      );

      // Replace the photo.
      await page.getByRole('button', { name: 'Edit Member' }).click();
      await updateForm(page)
        .getByLabel('Import a photo')
        .setInputFiles({
          name: 'new.png',
          mimeType: 'image/png',
          buffer: pngImage(64, 64, [10, 180, 90], [250, 220, 10]),
        });
      await updateForm(page).getByRole('button', { name: 'Update member' }).click();
      await expect(updateForm(page)).toBeHidden();

      const replaced = await api.getMember(member.registrationNumber);
      expect(replaced.profileImage, 'replaced photo').toBeTruthy();
      expect(replaced.profileImage).not.toBe(member.profileImage);
      const newPhotoUrl = `${UPLOADS_URL}/${replaced.profileImage}`;
      await expect(profilePhoto(page)).toHaveAttribute('src', newPhotoUrl);
      await expect
        .poll(() => profilePhoto(page).evaluate(img => (img as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
      expect((await page.request.get(newPhotoUrl)).status()).toBe(200);

      // Remove the photo.
      await page.getByRole('button', { name: 'Edit Member' }).click();
      await updateForm(page).getByRole('button', { name: 'Remove photo' }).click();
      await updateForm(page).getByRole('button', { name: 'Update member' }).click();
      await expect(updateForm(page)).toBeHidden();

      await expect(profilePhoto(page)).toHaveAttribute('src', DEFAULT_AVATAR_URL);
      expect((await api.getMember(member.registrationNumber)).profileImage).toBeNull();
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test("F4.5 opening the member card shows this member's badge", async ({ page, api }) => {
    const member = await api.createMember({ firstName: 'Badgeme' });
    try {
      await page.goto(`/profil/${member.registrationNumber}`);
      await page.getByRole('button', { name: 'Generate Cards' }).click();

      await expect(
        page.getByRole('heading', { name: 'Membership Card', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'MEMBERSHIP CARD', exact: true })).toHaveCount(
        1,
      );
      await expect(
        page.getByText(`${member.firstName} ${member.lastName}`, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(String(member.registrationNumber), { exact: true }).first(),
      ).toBeVisible();
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });

  test('F4.6 deleting from the profile redirects to the list and the member is gone', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Removeme' });
    try {
      await page.goto(`/profil/${member.registrationNumber}`);
      await page.getByRole('button', { name: 'Delete' }).click();
      await confirmDelete(page);

      await expect(page).toHaveURL(`${BASE_URL}/members`);
      await expect.poll(() => api.status(`members/${member.registrationNumber}`)).toBe(404);
      await page.getByRole('searchbox', { name: 'Search for members' }).fill(member.lastName ?? '');
      await expect(
        page.getByRole('status').getByText('No results match your search or filters.'),
      ).toBeVisible();
      await expect(memberRow(page, member)).toHaveCount(0);
    } finally {
      await api.deleteMemberIfExists(member.registrationNumber);
    }
  });

  test('F4.7 an unknown registration number shows a not-found state without crashing', async ({
    page,
    api,
  }) => {
    const unknown = 900000000 + Math.floor(Math.random() * 90000000);
    expect(await api.status(`members/${unknown}`), 'the number is unknown to the API').toBe(404);
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto(`/profil/${unknown}`);

    await expect(page.getByText(`Member ${unknown} is not found.`, { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
