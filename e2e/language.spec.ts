import { test as base, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { uniqueClientIp } from './fixtures/api';
import { BASE_URL } from './fixtures/env';
import { routeApi } from './fixtures/route-api';

type Language = 'en' | 'fr' | 'mg';

interface Translations {
  nav: Record<string, string>;
  pages: Record<string, string>;
}

/** The app's translation files (src/assets/i18n), read as the source of the labels. */
const I18N: Record<Language, Translations> = Object.fromEntries(
  (['en', 'fr', 'mg'] as Language[]).map(language => [
    language,
    JSON.parse(
      readFileSync(join(__dirname, '..', 'src', 'assets', 'i18n', `${language}.json`), 'utf8'),
    ) as Translations,
  ]),
) as Record<Language, Translations>;

/** Option labels of the navbar language select (NavbarComponent.languages). */
const OPTION_LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  mg: 'Malagasy',
};

/** Main menu entries shown to the admin (FlexMenusComponent.menus). */
const MENU_KEYS = ['home', 'members', 'volunteer', 'activity', 'checkin-history', 'book'];

/**
 * The only spec that switches language: it does not use the base test of the
 * other specs (which forces English at every page load). It keeps their
 * per-test client address for the API rate limiters.
 */
const test = base.extend({
  context: async ({ context }, use) => {
    const clientIp = uniqueClientIp();
    await routeApi(context, clientIp);
    await use(context);
  },
});

function navbar(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation' });
}

/** The language select; its label is translated too. */
function languageSelect(page: Page, current: Language) {
  return navbar(page).getByRole('combobox', { name: I18N[current].nav['language'] });
}

async function switchLanguage(page: Page, from: Language, to: Language) {
  await languageSelect(page, from).selectOption({ label: OPTION_LABELS[to] });
}

/** Asserts every main menu label in the language, and none of the other language. */
async function expectNavbarIn(page: Page, language: Language, previous?: Language) {
  const nav = navbar(page);
  // The menu entries are anchors rendered with the z-button directive (role "button").
  for (const key of MENU_KEYS) {
    await expect(
      nav.getByRole('button', { name: I18N[language].nav[key], exact: true }),
      `${language} nav.${key}`,
    ).toBeVisible();
  }
  if (previous) {
    for (const key of MENU_KEYS) {
      await expect(
        nav.getByRole('button', { name: I18N[previous].nav[key], exact: true }),
        `${previous} nav.${key} gone`,
      ).toHaveCount(0);
    }
  }
  await expect(languageSelect(page, language)).toHaveValue(language);
}

/** Starts on / in English (set before each page load of this test; no reload follows). */
async function openHomeInEnglish(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('acm-language', 'en'));
  await page.goto('/');
  await expect(page).toHaveURL(`${BASE_URL}/`);
  await expectNavbarIn(page, 'en');
}

test.describe('F14 Language', () => {
  test('F14.1 switching to French, Malagasy then English translates the navbar labels', async ({
    page,
  }) => {
    await openHomeInEnglish(page);

    await switchLanguage(page, 'en', 'fr');
    await expectNavbarIn(page, 'fr', 'en');

    await switchLanguage(page, 'fr', 'mg');
    await expectNavbarIn(page, 'mg', 'fr');

    await switchLanguage(page, 'mg', 'en');
    await expectNavbarIn(page, 'en', 'mg');
  });

  test('F14.2 the chosen language is kept after a reload', async ({ page, context }) => {
    // Sets English for the first load only, so the reload keeps what the user chose.
    await context.addInitScript(() => {
      if (!window.sessionStorage.getItem('e2e-language-set')) {
        window.sessionStorage.setItem('e2e-language-set', '1');
        window.localStorage.setItem('acm-language', 'en');
      }
    });
    await page.goto('/');
    await expectNavbarIn(page, 'en');

    await switchLanguage(page, 'en', 'fr');
    await expectNavbarIn(page, 'fr', 'en');

    await page.reload();
    await expectNavbarIn(page, 'fr', 'en');
  });

  test('F14.3 the chosen language applies on /members after navigation', async ({ page }) => {
    await openHomeInEnglish(page);

    await switchLanguage(page, 'en', 'mg');
    await expectNavbarIn(page, 'mg', 'en');

    await navbar(page).getByRole('button', { name: I18N.mg.nav['members'], exact: true }).click();

    await expect(page).toHaveURL(`${BASE_URL}/members`);
    await expect(
      page.getByRole('heading', { name: I18N.mg.pages['listOfMembers'], exact: true }),
    ).toBeVisible();
    await expectNavbarIn(page, 'mg', 'en');
  });
});
