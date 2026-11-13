import { Page } from '@playwright/test';
import { Member, uniqueSuffix } from './fixtures/api';
import { pngImage } from './fixtures/images';
import { printCalls, stubPrint } from './fixtures/print';
import { fetchQrPayload } from './fixtures/qr';
import { expect, test } from './fixtures/test';

/** Badge QR images come from this external service; the tests answer them locally. */
const QR_SERVICE = 'https://api.qrserver.com/v1/create-qr-code/';

/** Name as a member card writes it: Firstname Lastname. */
function cardName(member: Pick<Member, 'firstName' | 'lastName'>): string {
  return `${member.firstName} ${member.lastName}`;
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search for members' });
}

/** One "View <lastname>'s badge" button per listed card. */
function badgeButtons(page: Page) {
  return page.getByRole('button', { name: /^View .*'s badge$/ });
}

/**
 * A member card. Cards have no accessible container: the card is the innermost
 * div that holds the member's name heading and a checkbox.
 */
function memberCard(page: Page, member: Member) {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: cardName(member), exact: true }) })
    .filter({ has: page.getByRole('checkbox') })
    .last();
}

/**
 * The card viewer. It has no dialog role: it is the innermost div that holds
 * its title and its Print button.
 */
function cardViewer(page: Page) {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Membership Card', exact: true }) })
    .filter({ has: page.getByRole('button', { name: 'Print', exact: true }) })
    .last();
}

test.describe('F5 Member cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${QR_SERVICE}**`, route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: pngImage(80, 80) }),
    );
  });

  test('F5.1 search lists only matching members and clearing it restores the full list', async ({
    page,
    api,
  }) => {
    const token = `Srch${uniqueSuffix()}`;
    const match = await api.createMember({ firstName: 'Finder', lastName: `${token}x` });
    const other = await api.createMember({ firstName: 'Other' });
    try {
      const all = await api.getPage<Member>('members?limit=100');

      await page.goto('/cards');
      await expect(badgeButtons(page)).toHaveCount(all.pagination.total);

      await searchBox(page).fill(token);
      await expect(badgeButtons(page)).toHaveCount(1);
      await expect(page.getByRole('heading', { name: cardName(match), exact: true })).toBeVisible();

      await searchBox(page).clear();
      await expect(badgeButtons(page)).toHaveCount(all.pagination.total);
      await expect(page.getByRole('heading', { name: cardName(match), exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: cardName(other), exact: true })).toBeVisible();
    } finally {
      await api.deleteMember(match.registrationNumber);
      await api.deleteMember(other.registrationNumber);
    }
  });

  test('F5.2 select all selects every listed member and unselect all clears them', async ({
    page,
    api,
  }) => {
    const members = [
      await api.createMember({ firstName: 'Selectone' }),
      await api.createMember({ firstName: 'Selecttwo' }),
    ];
    try {
      const total = (await api.getPage<Member>('members?limit=1')).pagination.total;

      await page.goto('/cards');
      // The card checkboxes have no accessible name: they are the page's only checkboxes.
      const checkboxes = page.getByRole('checkbox');
      await expect(checkboxes).toHaveCount(total);
      await expect(page.getByRole('button', { name: `Select all (${total})` })).toBeVisible();

      await page.getByRole('button', { name: /^Select all/ }).click();
      for (const checkbox of await checkboxes.all()) {
        await expect(checkbox).toBeChecked();
      }
      await expect(page.getByRole('button', { name: `Unselect all (${total})` })).toBeVisible();
      await expect(page.getByRole('button', { name: `Print cards (${total})` })).toBeEnabled();

      await page.getByRole('button', { name: /^Unselect all/ }).click();
      for (const checkbox of await checkboxes.all()) {
        await expect(checkbox).not.toBeChecked();
      }
      await expect(page.getByRole('button', { name: 'Unselect all (0)' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Print cards (0)' })).toBeDisabled();
    } finally {
      for (const member of members) {
        await api.deleteMember(member.registrationNumber);
      }
    }
  });

  test('F5.3 printing the selected members shows them in the viewer and the print button calls print', async ({
    page,
    api,
  }) => {
    const token = `Prnt${uniqueSuffix()}`;
    const selected = [
      await api.createMember({ firstName: 'Printone', lastName: `${token}a` }),
      await api.createMember({ firstName: 'Printtwo', lastName: `${token}b` }),
    ];
    const notSelected = await api.createMember({ firstName: 'Printnot', lastName: `${token}c` });
    await stubPrint(page);
    try {
      await page.goto('/cards');
      await searchBox(page).fill(token);
      await expect(badgeButtons(page)).toHaveCount(3);
      for (const member of selected) {
        // A label covers the whole card: a click on the card toggles its checkbox.
        await memberCard(page, member).click();
        await expect(memberCard(page, member).getByRole('checkbox')).toBeChecked();
      }

      await page.getByRole('button', { name: 'Print cards (2)' }).click();

      const viewer = cardViewer(page);
      await expect(viewer).toBeVisible();
      await expect(
        viewer.getByRole('heading', { name: 'MEMBERSHIP CARD', exact: true }),
      ).toHaveCount(2);
      for (const member of selected) {
        await expect(viewer.getByText(cardName(member), { exact: true })).toBeVisible();
      }
      await expect(viewer.getByText(cardName(notSelected), { exact: true })).toHaveCount(0);

      expect(await printCalls(page), 'print not called before the click').toBe(0);
      await viewer.getByRole('button', { name: 'Print', exact: true }).click();
      await expect.poll(() => printCalls(page)).toBe(1);
    } finally {
      for (const member of [...selected, notSelected]) {
        await api.deleteMember(member.registrationNumber);
      }
    }
  });

  test("F5.4 the badge back QR image request carries the member's registration number and API signature", async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Qrbadge' });
    try {
      const expected = await fetchQrPayload(api, member.registrationNumber);

      await page.goto('/cards');
      await searchBox(page).fill(member.lastName as string);
      const qrRequest = page.waitForRequest(request => request.url().startsWith(QR_SERVICE));
      await page.getByRole('button', { name: `View ${member.lastName}'s badge` }).click();

      const url = new URL((await qrRequest).url());
      const data = url.searchParams.get('data');
      expect(data, 'data parameter of the QR image URL').not.toBeNull();
      expect(JSON.parse(data as string)).toEqual({
        registrationNumber: member.registrationNumber,
        signature: expected.signature,
      });
      await expect(cardViewer(page).getByRole('img', { name: 'QR Code' })).toBeVisible();
    } finally {
      await api.deleteMember(member.registrationNumber);
    }
  });
});
