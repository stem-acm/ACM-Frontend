import { Page } from '@playwright/test';
import { ApiHelper, Member, uniqueSuffix } from './fixtures/api';
import { expect, test } from './fixtures/test';

/**
 * The API has no endpoint to delete a book loan, and a member that has a loan
 * cannot be deleted (foreign key). Each test therefore uses its own members and
 * unique book titles, so no test depends on loans left by another run; at the
 * end its loans move to one keeper member and its members are deleted.
 */

/** Rows per page of the loans list (BooksComponent.pageSize). */
const PAGE_SIZE = 25;

interface BookLoan {
  id: number;
  registrationNumber: number;
  bookTitle: string;
  borrowingDate: string;
  expectedReturnDate: string;
  effectiveReturnDate: string | null;
  Member?: Member | null;
}

/** Today in the browser timezone (EAT), YYYY-MM-DD, as the app computes it. */
function todayEat(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Nov 13, 2026", as the Angular date pipe 'mediumDate' writes a YYYY-MM-DD date. */
function mediumDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function bodyRows(page: Page) {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

function loanRow(page: Page, title: string) {
  return bodyRows(page).filter({ has: page.getByRole('cell', { name: title, exact: true }) });
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Search book loans' });
}

function statusFilter(page: Page) {
  return page.getByRole('combobox', { name: 'Filter loans by status' });
}

function showing(page: Page, from: number, to: number, total: number) {
  return page.getByText(`Showing ${from} to ${to} of ${total} results`, { exact: true });
}

function pageIndicator(page: Page, current: number, total: number) {
  return page.getByText(`Page ${current} of ${total}`, { exact: true });
}

function loanForm(page: Page) {
  return page.getByRole('dialog', { name: 'New loan' });
}

function titleInput(page: Page) {
  return loanForm(page).getByRole('combobox', { name: 'Book title' });
}

/** Picks a member in the loan form: types in the member search, then clicks the suggestion. */
async function pickMember(page: Page, member: Member) {
  const form = loanForm(page);
  await form.getByLabel('Select member').fill(member.lastName ?? '');
  await form
    .getByRole('option', { name: `${member.firstName} ${member.lastName}` })
    .filter({ hasText: String(member.registrationNumber) })
    .click();
}

async function createLoan(
  api: ApiHelper,
  member: Member,
  bookTitle: string,
  dates: { borrowingDate?: string; expectedReturnDate?: string; effectiveReturnDate?: string } = {},
): Promise<BookLoan> {
  const borrowingDate = dates.borrowingDate ?? addDays(todayEat(), -2);
  return api.post<BookLoan>('book-loans', {
    registrationNumber: member.registrationNumber,
    bookTitle,
    borrowingDate,
    expectedReturnDate: dates.expectedReturnDate ?? addDays(borrowingDate, 14),
    effectiveReturnDate: dates.effectiveReturnDate ?? null,
  });
}

async function memberLoans(api: ApiHelper, member: Member): Promise<BookLoan[]> {
  const { data } = await api.getPage<BookLoan>(
    `book-loans?limit=100&search=${encodeURIComponent(member.lastName ?? '')}`,
  );
  return data.filter(loan => loan.registrationNumber === member.registrationNumber);
}

/** The one test member that keeps the loans of deleted test members. */
const LOAN_KEEPER = { firstName: 'E2e', lastName: 'Loankeeper' };

async function loanKeeper(api: ApiHelper): Promise<Member> {
  const { data } = await api.getPage<Member>(
    `members?limit=100&search=${encodeURIComponent(LOAN_KEEPER.lastName)}`,
  );
  const existing = data.find(
    m => m.firstName === LOAN_KEEPER.firstName && m.lastName === LOAN_KEEPER.lastName,
  );
  return existing ?? api.createMember(LOAN_KEEPER);
}

/**
 * Deletes a test member. Loans cannot be deleted and block the member's
 * deletion, so its loans first move to the loan keeper member.
 */
async function releaseMembers(api: ApiHelper, ...members: Member[]): Promise<void> {
  for (const member of members) {
    if ((await api.status(`members/${member.registrationNumber}`)) !== 200) continue;
    for (let left = await memberLoans(api, member); left.length > 0; ) {
      const keeper = await loanKeeper(api);
      for (const loan of left) {
        await api.put(`book-loans/${loan.id}`, { registrationNumber: keeper.registrationNumber });
      }
      left = await memberLoans(api, member);
    }
    await api.deleteMember(member.registrationNumber);
  }
}

test.describe('F10 Book loans', () => {
  test('F10.1 adding a loan lists it and stores it in the API with status not returned', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({
      firstName: 'Bookadd',
      lastName: `Bk${uniqueSuffix()}`,
    });
    const title = `Added book ${uniqueSuffix()}`;
    const borrowingDate = todayEat();
    const expectedReturnDate = addDays(borrowingDate, 10);
    try {
      await page.goto('/book');
      await page.getByRole('button', { name: 'New loan' }).click();
      await pickMember(page, member);
      await titleInput(page).fill(title);
      await loanForm(page).getByLabel('Borrowing date').fill(borrowingDate);
      await loanForm(page).getByLabel('Expected return date').fill(expectedReturnDate);
      await loanForm(page).getByRole('button', { name: 'Save loan' }).click();

      await expect(loanForm(page)).toBeHidden();
      const row = loanRow(page, title);
      await expect(row).toHaveCount(1);
      await expect(row.getByRole('cell')).toHaveText([
        new RegExp(`${member.registrationNumber}\\s*${member.firstName} ${member.lastName}`),
        title,
        mediumDate(borrowingDate),
        mediumDate(expectedReturnDate),
        '—',
        'On loan',
        'Mark as returned',
      ]);

      const stored = await memberLoans(api, member);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        registrationNumber: member.registrationNumber,
        bookTitle: title,
        borrowingDate,
        expectedReturnDate,
        effectiveReturnDate: null,
      });
    } finally {
      await releaseMembers(api, member);
    }
  });

  test('F10.2 a title used in an earlier loan is suggested when its first letters are typed', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Booksuggest' });
    try {
      const prefix = `Sg${uniqueSuffix()}`;
      const title = `${prefix} Suggested title`;
      await createLoan(api, member, title);

      await page.goto('/book');
      await page.getByRole('button', { name: 'New loan' }).click();
      await titleInput(page).pressSequentially(prefix);

      await expect(
        loanForm(page)
          .getByRole('listbox', { name: 'Book title' })
          .getByRole('option', { name: title, exact: true }),
      ).toBeVisible();
    } finally {
      await releaseMembers(api, member);
    }
  });

  test('F10.3 searching by title or by member lists only the matching loans', async ({
    page,
    api,
  }) => {
    const first = await api.createMember({
      firstName: 'Booksearch',
      lastName: `Bka${uniqueSuffix()}`,
    });
    const second = await api.createMember({
      firstName: 'Booksearch',
      lastName: `Bkb${uniqueSuffix()}`,
    });
    try {
      const firstTitle = `Searched title ${uniqueSuffix()}`;
      const secondTitles = [`Other title ${uniqueSuffix()}`, `Other title ${uniqueSuffix()}`];
      await createLoan(api, first, firstTitle);
      for (const title of secondTitles) {
        await createLoan(api, second, title);
      }

      await page.goto('/book');

      await searchBox(page).fill(firstTitle);
      await expect(bodyRows(page)).toHaveCount(1);
      await expect(loanRow(page, firstTitle)).toHaveCount(1);
      await expect(showing(page, 1, 1, 1)).toBeVisible();

      await searchBox(page).fill(second.lastName ?? '');
      await expect(bodyRows(page)).toHaveCount(2);
      for (const title of secondTitles) {
        await expect(loanRow(page, title)).toHaveCount(1);
      }
      await expect(loanRow(page, firstTitle)).toHaveCount(0);
      await expect(showing(page, 1, 2, 2)).toBeVisible();
    } finally {
      await releaseMembers(api, first, second);
    }
  });

  test('F10.4 the status filter shows only returned loans for "returned" and only the others for "not returned"', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Bookstatus' });
    try {
      const token = `Status${uniqueSuffix()}`;
      const borrowingDate = addDays(todayEat(), -5);
      const returnedTitle = `${token} returned`;
      const openTitle = `${token} open`;
      await createLoan(api, member, returnedTitle, {
        borrowingDate,
        effectiveReturnDate: addDays(borrowingDate, 2),
      });
      await createLoan(api, member, openTitle, { borrowingDate });

      await page.goto('/book');
      await searchBox(page).fill(token);
      await expect(bodyRows(page)).toHaveCount(2);

      await statusFilter(page).selectOption({ label: 'Returned' });
      await expect(loanRow(page, returnedTitle)).toHaveCount(1);
      await expect(loanRow(page, openTitle)).toHaveCount(0);
      await expect(bodyRows(page)).toHaveCount(1);
      await expect(loanRow(page, returnedTitle).getByRole('cell').nth(5)).toHaveText('Returned');

      const notReturned = statusFilter(page).getByRole('option', { name: /not returned/i });
      await expect(notReturned, 'a "not returned" status option').toHaveCount(1);
      await statusFilter(page).selectOption({ label: (await notReturned.textContent()) ?? '' });
      await expect(loanRow(page, openTitle)).toHaveCount(1);
      await expect(loanRow(page, returnedTitle)).toHaveCount(0);
      await expect(bodyRows(page)).toHaveCount(1);
    } finally {
      await releaseMembers(api, member);
    }
  });

  test('F10.5 marking a loan as returned changes its status and stores the effective return date', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({ firstName: 'Bookreturn' });
    try {
      const title = `Returned book ${uniqueSuffix()}`;
      const loan = await createLoan(api, member, title);
      const today = todayEat();

      await page.goto('/book');
      await searchBox(page).fill(title);
      const row = loanRow(page, title);
      await expect(row.getByRole('cell').nth(5)).toHaveText('On loan');

      await row.getByRole('button', { name: 'Mark as returned' }).click();

      await expect(row.getByRole('cell').nth(5)).toHaveText('Returned');
      await expect(row.getByRole('cell').nth(4)).toHaveText(mediumDate(today));
      await expect(row.getByRole('button', { name: 'Mark as returned' })).toHaveCount(0);
      const stored = await api.get<BookLoan>(`book-loans/${loan.id}`);
      expect(stored.effectiveReturnDate).toBe(today);
    } finally {
      await releaseMembers(api, member);
    }
  });

  test('F10.6 a required field left empty creates nothing and shows a validation message, pagination moves to the next page and back', async ({
    page,
    api,
  }) => {
    const member = await api.createMember({
      firstName: 'Bookinvalid',
      lastName: `Bk${uniqueSuffix()}`,
    });
    const pager = await api.createMember({ firstName: 'Bookpager' });
    const loanPosts: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && /\/api\/book-loans\/?$/.test(request.url())) {
        loanPosts.push(request.url());
      }
    });
    try {
      await page.goto('/book');
      await page.getByRole('button', { name: 'New loan' }).click();
      await pickMember(page, member);
      await loanForm(page).getByRole('button', { name: 'Save loan' }).click();

      await expect(loanForm(page).getByText('This field is required.')).toBeVisible();
      await expect(titleInput(page)).toHaveAttribute('aria-invalid', 'true');
      await expect(loanForm(page)).toBeVisible();
      expect(loanPosts, 'no POST /api/book-loans sent').toEqual([]);
      expect(await memberLoans(api, member)).toHaveLength(0);
      await loanForm(page).getByRole('button', { name: 'Cancel' }).click();

      // More loans than one page.
      const existing = (await api.getPage<BookLoan>('book-loans?limit=1')).pagination.total;
      const toCreate = Math.max(1, PAGE_SIZE + 1 - existing);
      const prefix = `Pager${uniqueSuffix()}`;
      for (let i = 0; i < toCreate; i++) {
        await createLoan(api, pager, `${prefix} n${String(i).padStart(3, '0')}`);
      }
      const firstPage = await api.getPage<BookLoan>(`book-loans?limit=${PAGE_SIZE}&offset=0`);
      const secondPage = await api.getPage<BookLoan>(
        `book-loans?limit=${PAGE_SIZE}&offset=${PAGE_SIZE}`,
      );
      const total = firstPage.pagination.total;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      expect(total, 'more loans than one page').toBeGreaterThan(PAGE_SIZE);

      await page.reload();
      await expect(showing(page, 1, PAGE_SIZE, total)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(loanRow(page, firstPage.data[0].bookTitle)).toHaveCount(1);

      await page.getByRole('button', { name: 'Next' }).click();
      await expect(pageIndicator(page, 2, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(secondPage.data.length);
      await expect(loanRow(page, secondPage.data[0].bookTitle)).toHaveCount(1);
      await expect(loanRow(page, firstPage.data[0].bookTitle)).toHaveCount(0);

      await page.getByRole('button', { name: 'Previous' }).click();
      await expect(pageIndicator(page, 1, totalPages)).toBeVisible();
      await expect(bodyRows(page)).toHaveCount(PAGE_SIZE);
      await expect(loanRow(page, firstPage.data[0].bookTitle)).toHaveCount(1);
    } finally {
      await releaseMembers(api, member, pager);
    }
  });
});
